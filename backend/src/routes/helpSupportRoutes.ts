import express from 'express';
import { 
  getHelpArticles, 
  createSupportTicket, 
  addSupportTicketMessage, 
  getCustomerTickets 
} from '../config/db';

const router = express.Router();

// GET search help articles FAQ
router.get('/search', async (req, res) => {
  try {
    const query = (req.query.q as string) || '';
    const articles = await getHelpArticles(query);
    res.json(articles);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET all tickets for a customer
router.get('/customer/:customerId/tickets', async (req, res) => {
  try {
    const { customerId } = req.params;
    const tickets = await getCustomerTickets(customerId);
    res.json(tickets);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST raise a new support ticket
router.post('/customer/:customerId/tickets/create', async (req, res) => {
  try {
    const { customerId } = req.params;
    const { orderId, category, priority, subject, description, sessionId } = req.body;

    const ticket = await createSupportTicket(
      customerId,
      orderId || null,
      category,
      priority,
      subject,
      description,
      sessionId || 'sess_support'
    );

    if (ticket) {
      res.json(ticket);
    } else {
      res.status(500).json({ error: 'Failed to create support ticket' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST add a message to support ticket thread
router.post('/tickets/:ticketId/message', async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { senderType, senderId, message, sessionId } = req.body;

    const chatMessage = await addSupportTicketMessage(
      ticketId,
      senderType,
      senderId,
      message,
      sessionId || 'sess_support_msg'
    );

    if (chatMessage) {
      res.json(chatMessage);
    } else {
      res.status(500).json({ error: 'Failed to append ticket message' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
