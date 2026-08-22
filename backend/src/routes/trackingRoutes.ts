import { Router, Request, Response } from 'express';
import { 
  getShipmentByOrderId, 
  addShipmentTrackingEvent, 
  getCustomerById, 
  createShipmentForOrder 
} from '../config/db';
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

// GET /api/tracking/:orderId
router.get('/:orderId', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const shipment = await getShipmentByOrderId(orderId);
    if (!shipment) {
      return res.status(404).json({ success: false, error: 'Shipment tracking details not found for this order.' });
    }
    return res.json({ success: true, shipment });
  } catch (error: any) {
    console.error('[API Error] Fetching shipment details failed:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// POST /api/tracking/:orderId/click
router.post('/:orderId/click', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const { session_id, customer_id } = req.body;
    
    if (!session_id || !customer_id) {
      return res.status(400).json({ success: false, error: 'session_id and customer_id are required' });
    }

    const shipment = await getShipmentByOrderId(orderId);
    const context = await getGeoContext(customer_id);

    EventLogger.logEvent({
      event_type: 'track_order_clicked',
      session_id,
      customer_id,
      user_type: 'registered',
      page: 'tracking',
      context,
      metadata: {
        order_id: orderId,
        shipment_id: shipment ? shipment.shipment_id : null
      }
    });

    return res.json({ success: true });
  } catch (error: any) {
    console.error('[API Error] Logging track order click failed:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// POST /api/tracking/:orderId/simulate-advance
router.post('/:orderId/simulate-advance', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const { action, session_id } = req.body; // action: 'advance' | 'delay' | 'fail'

    let shipment = await getShipmentByOrderId(orderId);
    if (!shipment) {
      return res.status(404).json({ success: false, error: 'No active shipment found for this order.' });
    }

    const currentStatus = shipment.shipment_status;
    const context = await getGeoContext(shipment.customer_id);
    const sessionVal = session_id || `sess_sim_${Math.random().toString(36).substr(2, 6)}`;

    let newStatus = currentStatus;
    let desc = '';
    let city = shipment.destination_city;
    let state = shipment.destination_state;
    let country = shipment.destination_country;
    let facilityId = null;

    if (action === 'delay') {
      newStatus = 'DELAYED';
      desc = 'Delivery delayed due to operational weather disruptions.';
      
      // Update shipment estimated date
      const newEst = new Date(shipment.estimated_delivery);
      newEst.setDate(newEst.getDate() + 1);
      
      await addShipmentTrackingEvent(shipment.shipment_id, 'DELAYED', city, state, country, desc);
      
      // Log delayed event
      EventLogger.logEvent({
        event_type: 'shipment_delayed',
        session_id: sessionVal,
        customer_id: shipment.customer_id,
        user_type: 'registered',
        page: 'tracking',
        context,
        metadata: {
          order_id: orderId,
          shipment_id: shipment.shipment_id,
          reason: 'WEATHER_DELAY',
          previous_estimated_delivery: shipment.estimated_delivery,
          new_estimated_delivery: newEst.toISOString().split('T')[0]
        }
      });
      
      const updated = await getShipmentByOrderId(orderId);
      return res.json({ success: true, message: 'Shipment delayed successfully.', shipment: updated });
    }

    if (action === 'fail') {
      newStatus = 'DELIVERY_FAILED';
      desc = 'Delivery attempt failed. Customer was unavailable at the address.';
      
      await addShipmentTrackingEvent(shipment.shipment_id, 'DELIVERY_FAILED', city, state, country, desc);
      
      // Log delivery failed event
      EventLogger.logEvent({
        event_type: 'delivery_failed',
        session_id: sessionVal,
        customer_id: shipment.customer_id,
        user_type: 'registered',
        page: 'tracking',
        context,
        metadata: {
          order_id: orderId,
          shipment_id: shipment.shipment_id,
          reason: 'CUSTOMER_UNAVAILABLE',
          delivery_attempt: 1,
          city,
          state
        }
      });
      
      const updated = await getShipmentByOrderId(orderId);
      return res.json({ success: true, message: 'Delivery failure logged successfully.', shipment: updated });
    }

    // Standard progression loop:
    // CREATED -> PACKED -> SHIPPED -> PICKED_UP -> IN_TRANSIT -> ARRIVED_AT_FACILITY -> OUT_FOR_DELIVERY -> DELIVERED
    switch (currentStatus) {
      case 'CREATED':
        newStatus = 'PACKED';
        desc = 'Items picked, verified, and safely packed in warehouse boxes.';
        city = 'Bengaluru';
        state = 'Karnataka';
        facilityId = 'WH-BLR-01';
        break;
      case 'PACKED':
        newStatus = 'SHIPPED';
        desc = 'Package handed over to carrier partners.';
        city = 'Bengaluru';
        state = 'Karnataka';
        facilityId = 'WH-BLR-01';
        break;
      case 'SHIPPED':
        newStatus = 'PICKED_UP';
        desc = 'Shipment picked up by carrier vehicle and dispatched.';
        city = 'Bengaluru';
        state = 'Karnataka';
        break;
      case 'PICKED_UP':
        newStatus = 'IN_TRANSIT';
        desc = `Shipment in transit from Bengaluru towards ${shipment.destination_city}.`;
        city = 'Bengaluru';
        state = 'Karnataka';
        break;
      case 'IN_TRANSIT':
        newStatus = 'ARRIVED_AT_FACILITY';
        desc = `Shipment arrived at facility hub in ${shipment.destination_city}.`;
        city = shipment.destination_city;
        state = shipment.destination_state;
        facilityId = `FAC-${shipment.destination_city.substr(0, 3).toUpperCase()}-01`;
        break;
      case 'ARRIVED_AT_FACILITY':
      case 'DELIVERY_FAILED':
      case 'DELAYED':
        newStatus = 'OUT_FOR_DELIVERY';
        desc = `Package out for delivery with the local delivery executive in ${shipment.destination_city}.`;
        city = shipment.destination_city;
        state = shipment.destination_state;
        break;
      case 'OUT_FOR_DELIVERY':
        newStatus = 'DELIVERED';
        desc = 'Package successfully delivered and signed by the customer.';
        city = shipment.destination_city;
        state = shipment.destination_state;
        break;
      case 'DELIVERED':
        return res.status(400).json({ success: false, error: 'Shipment has already been delivered.' });
      default:
        newStatus = 'CREATED';
        desc = 'Package record generated and verified.';
        city = 'Bengaluru';
        state = 'Karnataka';
    }

    await addShipmentTrackingEvent(shipment.shipment_id, newStatus, city, state, country, desc, facilityId);

    // Emit the matching telemetry event to JSONL
    let telemetryType = '';
    let telemetryMeta: any = {
      order_id: orderId,
      shipment_id: shipment.shipment_id,
      tracking_number: shipment.tracking_number,
      previous_status: currentStatus,
      new_status: newStatus
    };

    switch (newStatus) {
      case 'PACKED':
        telemetryType = 'shipment_packed';
        break;
      case 'SHIPPED':
        telemetryType = 'shipment_shipped';
        telemetryMeta.warehouse_id = 'WH-BLR-01';
        break;
      case 'PICKED_UP':
        telemetryType = 'shipment_picked_up';
        telemetryMeta.location = { city, state, country };
        break;
      case 'IN_TRANSIT':
        telemetryType = 'shipment_in_transit';
        telemetryMeta.origin_city = 'Bengaluru';
        telemetryMeta.destination_city = shipment.destination_city;
        break;
      case 'ARRIVED_AT_FACILITY':
        telemetryType = 'shipment_arrived_facility';
        telemetryMeta.facility_id = facilityId;
        telemetryMeta.location = { city, state, country };
        break;
      case 'OUT_FOR_DELIVERY':
        telemetryType = 'out_for_delivery';
        telemetryMeta.destination_city = city;
        telemetryMeta.destination_state = state;
        break;
      case 'DELIVERED':
        telemetryType = 'delivered';
        telemetryMeta.delivery_city = city;
        telemetryMeta.delivery_state = state;
        telemetryMeta.delivery_attempt = 1;
        break;
    }

    if (telemetryType) {
      EventLogger.logEvent({
        event_type: telemetryType,
        session_id: sessionVal,
        customer_id: shipment.customer_id,
        user_type: 'registered',
        page: 'tracking',
        context,
        metadata: telemetryMeta
      });
    }

    const updated = await getShipmentByOrderId(orderId);
    return res.json({ success: true, message: `Shipment advanced to ${newStatus}.`, shipment: updated });
  } catch (error: any) {
    console.error('[API Error] Simulating shipment advance failed:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

export default router;
