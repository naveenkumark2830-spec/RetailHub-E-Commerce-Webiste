import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { getInvoiceById, getInvoiceByOrderId, getCustomerById, createInvoiceForOrder } from '../config/db';
import { EventLogger } from '../services/eventLogger';

const router = Router();

// Helper to resolve geo context
async function getGeoContext(customerId: string) {
  let country = 'India';
  let state = 'Karnataka';
  let city = 'Bengaluru';
  if (customerId) {
    const cust = await getCustomerById(customerId);
    if (cust) {
      country = cust.country;
      state = cust.state;
      city = cust.city;
    }
  }
  return {
    country,
    state,
    city,
    device: 'desktop',
    browser: 'Chrome'
  };
}

// GET /api/invoices/:invoiceId
router.get('/:invoiceId', async (req: Request, res: Response) => {
  try {
    const { invoiceId } = req.params;
    const invoice = await getInvoiceById(invoiceId);
    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found.' });
    }
    return res.json({ success: true, invoice });
  } catch (error: any) {
    console.error('[API Error] Fetching invoice details failed:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// GET /api/invoices/by-order/:orderId
router.get('/by-order/:orderId', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    let invoice = await getInvoiceByOrderId(orderId);
    if (!invoice) {
      // Try generating invoice on-the-fly for past orders
      try {
        await createInvoiceForOrder(orderId);
        invoice = await getInvoiceByOrderId(orderId);
      } catch (genErr: any) {
        console.warn(`[Invoice on-the-fly Warning] Could not generate invoice for order ${orderId}: ${genErr.message}`);
      }
    }
    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice details not found for this order.' });
    }
    return res.json({ success: true, invoice });
  } catch (error: any) {
    console.error('[API Error] Fetching invoice by order failed:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// GET /api/invoices/:invoiceId/download-file
router.get('/:invoiceId/download-file', async (req: Request, res: Response) => {
  try {
    const { invoiceId } = req.params;
    const invoice = await getInvoiceById(invoiceId);
    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found.' });
    }

    // Resolve receipt file path
    const absolutePath = path.join(process.cwd(), invoice.pdf_path);
    if (!fs.existsSync(absolutePath)) {
      // Re-create the file on the fly if deleted or missing from prior runs
      const invoicesDir = path.dirname(absolutePath);
      if (!fs.existsSync(invoicesDir)) {
        fs.mkdirSync(invoicesDir, { recursive: true });
      }

      let txtContent = `==================================================\n`;
      txtContent += `                  RETAILHUB INVOICE\n`;
      txtContent += `==================================================\n`;
      txtContent += `GSTIN          : 29AAAAA0000A1Z5\n`;
      txtContent += `Invoice Number : ${invoice.invoice_number}\n`;
      txtContent += `Invoice Date   : ${new Date(invoice.invoice_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}\n`;
      txtContent += `Order Reference: ${invoice.order_id}\n`;
      txtContent += `Customer ID    : ${invoice.customer_id}\n\n`;

      txtContent += `BILL TO / SHIP TO:\n`;
      txtContent += `${invoice.customer?.first_name || 'Customer'} ${invoice.customer?.last_name || ''}\n`;
      txtContent += `${invoice.address?.city || 'Bengaluru'}, ${invoice.address?.state || 'Karnataka'}\n`;
      txtContent += `${invoice.address?.country || 'India'}\n\n`;

      txtContent += `--------------------------------------------------\n`;
      txtContent += `ITEMS DETAILS:\n`;
      txtContent += `--------------------------------------------------\n`;

      for (const item of invoice.items) {
        txtContent += `- ${item.product_name} (Qty ${item.quantity}) - Price: ₹${Number(item.unit_price).toLocaleString()} (Total: ₹${Number(item.line_total).toLocaleString()})\n`;
      }
      txtContent += `--------------------------------------------------\n`;
      txtContent += `Subtotal       : ₹${Number(invoice.subtotal).toLocaleString()}\n`;
      if (Number(invoice.discount) > 0) {
        txtContent += `Coupon Discount: -₹${Number(invoice.discount).toLocaleString()}\n`;
      }
      txtContent += `Estimated GST  : ₹${Number(invoice.tax).toLocaleString()}\n`;
      txtContent += `Shipping Fee   : ${Number(invoice.shipping_fee) === 0 ? 'FREE' : '₹' + Number(invoice.shipping_fee).toLocaleString()}\n`;
      txtContent += `GRAND TOTAL    : ₹${Number(invoice.total_amount).toLocaleString()}\n`;
      txtContent += `--------------------------------------------------\n`;
      txtContent += `Payment Method : ${invoice.payment_method}\n`;
      txtContent += `Payment Status : ${invoice.payment_status}\n`;
      txtContent += `==================================================\n`;
      txtContent += `Thank you for shopping with RetailHub!\n`;

      fs.writeFileSync(absolutePath, txtContent, 'utf-8');
    }

    const filename = path.basename(absolutePath);
    return res.download(absolutePath, filename);
  } catch (error: any) {
    console.error('[API Error] Downloading receipt file failed:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// POST /api/invoices/:invoiceId/download-click
router.post('/:invoiceId/download-click', async (req: Request, res: Response) => {
  try {
    const { invoiceId } = req.params;
    const { session_id, customer_id } = req.body;

    if (!session_id || !customer_id) {
      return res.status(400).json({ success: false, error: 'session_id and customer_id are required' });
    }

    const invoice = await getInvoiceById(invoiceId);
    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found.' });
    }

    const context = await getGeoContext(customer_id);

    // Emit telemetry event
    EventLogger.logEvent({
      event_type: 'invoice_downloaded',
      session_id,
      customer_id,
      user_type: 'registered',
      page: 'invoice',
      context,
      metadata: {
        invoice_id: invoiceId,
        order_id: invoice.order_id
      }
    });

    return res.json({ success: true });
  } catch (error: any) {
    console.error('[API Error] Logging invoice download click failed:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

export default router;
