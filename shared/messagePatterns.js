const amqp = require('amqplib');

class MessageBroker {
  constructor() {
    this.connection = null;
    this.channel = null;
  }

  async connect(url = process.env.RABBITMQ_URL) {
    try {
      this.connection = await amqp.connect(url);
      this.channel = await this.connection.createChannel();
      
      // Setup exchanges
      await this.setupExchanges();
      
      console.log('Connected to RabbitMQ');
    } catch (error) {
      console.error('RabbitMQ connection error:', error);
      throw error;
    }
  }

  async setupExchanges() {
    const exchanges = [
      'moukawalati.events',      // General moukawalati events
      'moukawalati.commands',    // Command messages
      'moukawalati.notifications', // User notifications
      'moukawalati.audit'        // Audit trail
    ];

    for (const exchange of exchanges) {
      await this.channel.assertExchange(exchange, 'topic', { durable: true });
    }
  }

  // Publish event to other services
  async publishEvent(exchange, routingKey, data) {
    const message = {
      id: require('uuid').v4(),
      timestamp: new Date().toISOString(),
      service: process.env.SERVICE_NAME || 'unknown',
      data
    };

    await this.channel.publish(
      exchange, 
      routingKey, 
      Buffer.from(JSON.stringify(message)),
      { persistent: true }
    );
  }

  // Subscribe to events from other services
  async subscribeToEvents(exchange, routingKeys, handler) {
    const queueName = `${process.env.SERVICE_NAME || 'service'}.${exchange}`;
    
    await this.channel.assertQueue(queueName, { durable: true });
    
    for (const key of routingKeys) {
      await this.channel.bindQueue(queueName, exchange, key);
    }

    await this.channel.consume(queueName, async (msg) => {
      if (msg) {
        try {
          const data = JSON.parse(msg.content.toString());
          await handler(data, msg.fields.routingKey);
          this.channel.ack(msg);
        } catch (error) {
          console.error('Message processing error:', error);
          this.channel.nack(msg, false, false); // Dead letter
        }
      }
    });
  }

  async close() {
    if (this.connection) {
      await this.connection.close();
    }
  }
}

// Event types for each service
const EventTypes = {
  // User/Auth events
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',
  USER_LOGIN: 'user.login',

  // CRM events  
  COMPANY_CREATED: 'crm.company.created',
  CONTACT_CREATED: 'crm.contact.created',
  LEAD_CONVERTED: 'crm.lead.converted',

  // Invoice events
  INVOICE_CREATED: 'invoice.created',
  INVOICE_SENT: 'invoice.sent',
  INVOICE_PAID: 'invoice.paid',
  PAYMENT_RECEIVED: 'invoice.payment.received',

  // Project events
  PROJECT_CREATED: 'project.created',
  PROJECT_COMPLETED: 'project.completed',
  TASK_ASSIGNED: 'project.task.assigned',
  TASK_COMPLETED: 'project.task.completed',

  // Inventory events
  PRODUCT_CREATED: 'inventory.product.created',
  STOCK_UPDATED: 'inventory.stock.updated',
  LOW_STOCK_ALERT: 'inventory.stock.low',
  REORDER_TRIGGERED: 'inventory.reorder.triggered',

  // Warehouse events
  STOCK_MOVEMENT: 'warehouse.stock.movement',
  SHIPMENT_CREATED: 'warehouse.shipment.created',
  SHIPMENT_DISPATCHED: 'warehouse.shipment.dispatched',

  // Accounting events
  TRANSACTION_CREATED: 'accounting.transaction.created',
  PAYMENT_PROCESSED: 'accounting.payment.processed',
  INVOICE_POSTED: 'accounting.invoice.posted',

  // System events
  SYSTEM_BACKUP: 'system.backup.completed',
  SYSTEM_MAINTENANCE: 'system.maintenance.scheduled'
};

module.exports = { MessageBroker, EventTypes };