import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ShoppingBag, 
  ArrowLeft, 
  MapPin, 
  Clock, 
  AlertCircle, 
  CheckCircle,
  Truck,
  Calendar
} from 'lucide-react';
import { useSessionStore } from '../store/useSessionStore';

interface TrackingEvent {
  tracking_event_id: string;
  shipment_id: string;
  order_id: string;
  status: string;
  location_city: string;
  location_state: string;
  location_country: string;
  facility_id: string | null;
  description: string;
  event_time: string;
}

interface Shipment {
  shipment_id: string;
  order_id: string;
  customer_id: string;
  warehouse_id: string;
  carrier_id: string;
  tracking_number: string;
  shipment_status: string;
  origin_city: string;
  origin_state: string;
  origin_country: string;
  destination_city: string;
  destination_state: string;
  destination_country: string;
  estimated_delivery: string;
  actual_delivery: string | null;
  created_at: string;
  shipped_at: string | null;
  delivered_at: string | null;
  events: TrackingEvent[];
}

export const OrderTrackingPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { customer, session } = useSessionStore();
  
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchTracking = async () => {
    try {
      const response = await fetch(`/api/tracking/${orderId}`);
      const data = await response.json();
      if (response.ok && data.success) {
        setShipment(data.shipment);
        setErrorMsg(null);
      } else {
        setErrorMsg(data.error || 'Tracking details not found.');
      }
    } catch (err) {
      console.error('Failed to load tracking data:', err);
      setErrorMsg('Failed to query logistics database.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTracking();
  }, [orderId]);

  // Log page view event
  const hasLoggedPageView = useRef(false);
  useEffect(() => {
    if (session && shipment && !hasLoggedPageView.current) {
      hasLoggedPageView.current = true;
      fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: 'page_view',
          session_id: session.session_id,
          customer_id: customer?.customer_id || null,
          page: 'order_tracking',
          device: 'desktop',
          browser: 'Chrome',
          metadata: { 
            page: 'order_tracking',
            order_id: orderId,
            shipment_id: shipment.shipment_id
          }
        })
      }).catch(err => console.warn(err));
    }
  }, [session, shipment, orderId, customer]);


  const getStageLabel = (status: string) => {
    switch (status) {
      case 'CREATED': return 'Confirmed';
      case 'PACKED': return 'Packed';
      case 'SHIPPED': return 'Shipped';
      case 'PICKED_UP': return 'Dispatched';
      case 'IN_TRANSIT': return 'In Transit';
      case 'ARRIVED_AT_FACILITY': return 'Facility Arrived';
      case 'OUT_FOR_DELIVERY': return 'Out For Delivery';
      case 'DELIVERED': return 'Delivered';
      case 'DELAYED': return 'Delayed (In Transit)';
      case 'DELIVERY_FAILED': return 'Failed Attempt';
      default: return status;
    }
  };

  const stages = [
    { label: 'Confirmed', key: 'CREATED' },
    { label: 'Packed', key: 'PACKED' },
    { label: 'Shipped', key: 'SHIPPED' },
    { label: 'In Transit', key: 'IN_TRANSIT' },
    { label: 'Delivered', key: 'DELIVERED' }
  ];

  // Resolve active stages for tracking bar
  const isStageActive = (stageKey: string) => {
    if (!shipment) return false;
    const currentStatus = shipment.shipment_status;
    
    const stageMap: Record<string, string[]> = {
      'CREATED': ['CREATED', 'PACKED', 'SHIPPED', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED_AT_FACILITY', 'OUT_FOR_DELIVERY', 'DELIVERED'],
      'PACKED': ['PACKED', 'SHIPPED', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED_AT_FACILITY', 'OUT_FOR_DELIVERY', 'DELIVERED'],
      'SHIPPED': ['SHIPPED', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED_AT_FACILITY', 'OUT_FOR_DELIVERY', 'DELIVERED'],
      'IN_TRANSIT': ['IN_TRANSIT', 'ARRIVED_AT_FACILITY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'DELAYED'],
      'DELIVERED': ['DELIVERED']
    };

    return stageMap[stageKey]?.includes(currentStatus) || false;
  };

  const getStatusColorClass = (status: string) => {
    switch (status) {
      case 'DELIVERED': return 'text-emerald-600 bg-emerald-50 border-emerald-100';
      case 'DELAYED': return 'text-rose-600 bg-rose-50 border-rose-100';
      case 'DELIVERY_FAILED': return 'text-amber-600 bg-amber-50 border-amber-100';
      default: return 'text-blue-600 bg-blue-50 border-blue-100';
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8F9] flex flex-col justify-between text-[#041E42] relative">
      {/* HEADER */}
      <header className="bg-[#0071DC] text-white py-4 px-6 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div 
            onClick={() => navigate('/home')} 
            className="flex items-center space-x-2 cursor-pointer"
          >
            <div className="bg-[#FFC220] text-[#041E42] p-2 rounded-full font-bold">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <span className="text-xl font-extrabold tracking-tight">NexDay</span>
          </div>

          <button 
            onClick={() => navigate('/orders')}
            className="flex items-center space-x-1 text-sm font-semibold text-blue-100 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Orders</span>
          </button>
        </div>
      </header>

      {/* TRACKING CONTENT */}
      <main className="max-w-4xl w-full mx-auto flex-grow p-6 space-y-6">
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-8 h-8 border-4 border-[#0071DC] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : errorMsg ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white p-12 rounded-3xl border border-red-100 text-center space-y-4 shadow-sm"
          >
            <div className="text-red-500 w-16 h-16 mx-auto flex items-center justify-center bg-red-50 rounded-full">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="text-base font-extrabold text-gray-700">Tracking not available</h3>
            <p className="text-xs text-gray-400 font-medium max-w-sm mx-auto leading-relaxed">
              {errorMsg}
            </p>
            <button 
              onClick={() => navigate('/orders')}
              className="bg-[#0071DC] hover:bg-[#0046BE] text-white px-6 py-2.5 rounded-full font-bold text-xs transition-colors"
            >
              Back to Orders
            </button>
          </motion.div>
        ) : shipment ? (
          <div className="space-y-6">
            {/* Title */}
            <div>
              <h1 className="text-2xl font-black tracking-tight text-gray-800">Track Your Shipment</h1>
              <div className="flex flex-wrap gap-x-4 text-xs font-mono font-bold text-gray-400 mt-1">
                <span>Order: {shipment.order_id}</span>
                <span>•</span>
                <span>Tracking ID: {shipment.tracking_number}</span>
              </div>
            </div>

            {/* PROGRESS BAR BAR */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
              <div className="relative flex justify-between items-center w-full mt-4">
                {/* Background line */}
                <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-100 -translate-y-1/2 z-0 rounded-full"></div>
                {/* Active line */}
                <div 
                  className="absolute top-1/2 left-0 h-1 bg-emerald-500 -translate-y-1/2 z-0 rounded-full transition-all duration-500"
                  style={{ 
                    width: `${
                      shipment.shipment_status === 'DELIVERED' ? 100 :
                      shipment.shipment_status === 'OUT_FOR_DELIVERY' || shipment.shipment_status === 'DELIVERY_FAILED' ? 75 :
                      shipment.shipment_status === 'IN_TRANSIT' || shipment.shipment_status === 'DELAYED' || shipment.shipment_status === 'ARRIVED_AT_FACILITY' ? 55 :
                      shipment.shipment_status === 'SHIPPED' || shipment.shipment_status === 'PICKED_UP' ? 38 :
                      shipment.shipment_status === 'PACKED' ? 18 : 0
                    }%` 
                  }}
                ></div>

                {stages.map((stg, i) => {
                  const active = isStageActive(stg.key);
                  return (
                    <div key={stg.key} className="flex flex-col items-center z-10 relative">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-sm transition-all duration-300 border-2 ${
                        active 
                          ? 'bg-emerald-500 border-emerald-500 text-white' 
                          : 'bg-white border-gray-200 text-gray-400'
                      }`}>
                        {active ? <CheckCircle className="w-4 h-4" /> : i + 1}
                      </div>
                      <span className={`text-[10px] font-bold mt-2 ${
                        active ? 'text-emerald-600' : 'text-gray-400'
                      }`}>
                        {stg.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* STATUS HIGHLIGHT DETAILS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`p-5 rounded-3xl border shadow-sm ${getStatusColorClass(shipment.shipment_status)} flex items-start space-x-3`}>
                <div className="p-2 bg-white rounded-2xl shadow-sm">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Logistics Status</span>
                  <h4 className="text-sm font-black uppercase mt-0.5">{getStageLabel(shipment.shipment_status)}</h4>
                </div>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-start space-x-3 text-gray-700">
                <div className="p-2 bg-blue-50 text-[#0071DC] rounded-2xl">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Estimated Delivery</span>
                  <h4 className="text-sm font-black mt-0.5">
                    {new Date(shipment.estimated_delivery).toLocaleDateString(undefined, { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })}
                  </h4>
                </div>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-start space-x-3 text-gray-700">
                <div className="p-2 bg-blue-50 text-[#0071DC] rounded-2xl">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Destination Route</span>
                  <h4 className="text-sm font-black mt-0.5 truncate max-w-[160px]">
                    {shipment.destination_city}, {shipment.destination_state}
                  </h4>
                </div>
              </div>
            </div>

            {/* TIMELINE TRACKING HISTORY */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
              <div className="flex items-center space-x-2 border-b border-gray-100 pb-3">
                <Clock className="w-5 h-5 text-gray-400" />
                <h3 className="text-sm font-black text-gray-700 uppercase tracking-wider">Shipment History Logs</h3>
              </div>

              <div className="relative pl-6 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-gray-100">
                {shipment.events.slice().reverse().map((evt, idx) => (
                  <div key={evt.tracking_event_id} className="relative flex items-start gap-4">
                    {/* Event node dot */}
                    <div className={`absolute -left-[20px] top-1 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm ${
                      idx === 0 ? 'bg-[#0071DC] ring-4 ring-blue-50' : 'bg-[#FFC220]'
                    }`}></div>

                    <div className="space-y-1 flex-grow">
                      <div className="flex items-center justify-between">
                        <h4 className={`text-xs font-black uppercase ${
                          idx === 0 ? 'text-[#0071DC]' : 'text-gray-700'
                        }`}>
                          {getStageLabel(evt.status)}
                        </h4>
                        <span className="text-[10px] font-mono text-gray-400">
                          {new Date(evt.event_time).toLocaleDateString()} {new Date(evt.event_time).toLocaleTimeString(undefined, { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 font-medium leading-relaxed">
                        {evt.description}
                      </p>
                      <div className="flex items-center space-x-1.5 text-[9px] text-gray-400 font-black uppercase">
                        <MapPin className="w-3 h-3" />
                        <span>{evt.location_city}, {evt.location_state}</span>
                        {evt.facility_id && (
                          <>
                            <span>•</span>
                            <span>Facility: {evt.facility_id}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ROUTING INFO DETAILS CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-3">
                <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Courier & Dispatched Warehouse</span>
                <div className="space-y-2 text-xs font-semibold text-gray-600">
                  <div className="flex justify-between border-b border-gray-50 pb-1.5">
                    <span>Warehouse Code</span>
                    <span className="font-bold text-[#041E42]">{shipment.warehouse_id}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-50 pb-1.5">
                    <span>Dispatch Origin</span>
                    <span className="font-bold text-[#041E42]">{shipment.origin_city}, {shipment.origin_state}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Logistics Carrier</span>
                    <span className="font-bold text-[#041E42]">{shipment.carrier_id}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-3">
                <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Delivery Address Summary</span>
                <div className="space-y-1 text-xs font-semibold text-gray-600">
                  <h4 className="font-black text-[#041E42]">{customer?.first_name} {customer?.last_name}</h4>
                  <p>{shipment.destination_city}, {shipment.destination_state}</p>
                  <p>{shipment.destination_country}</p>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </main>

      {/* FOOTER */}
      <footer className="bg-[#041E42] text-white py-6 mt-12 text-center text-xs font-bold">
        <p className="text-gray-400">&copy; 2026 NexDay Systems India Pvt Ltd. All transactions are securely routed through mock banking interfaces.</p>
      </footer>
    </div>
  );
};
