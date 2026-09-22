const topicMap: Record<string, string> = {
  // USER
  login: "retail_user_events",
  login_failed: "retail_user_events",
  logout: "retail_user_events",
  session_started: "retail_user_events",
  session_ended: "retail_user_events",
  profile_viewed: "retail_user_events",
  profile_updated: "retail_user_events",
  address_added: "retail_user_events",
  address_updated: "retail_user_events",
  address_deleted: "retail_user_events",
  password_changed: "retail_user_events",
  email_changed: "retail_user_events",
  phone_changed: "retail_user_events",
  device_registered: "retail_user_events",
  payment_method_changed: "retail_user_events",

  // DISCOVERY
  page_view: "retail_discovery_events",
  category_view: "retail_discovery_events",
  search: "retail_discovery_events",
  search_result_clicked: "retail_discovery_events",
  filter_applied: "retail_discovery_events",
  product_view: "retail_discovery_events",
  product_image_view: "retail_discovery_events",
  product_details_view: "retail_discovery_events",
  product_impression: "retail_discovery_events",
  wishlist_add: "retail_discovery_events",
  wishlist_remove: "retail_discovery_events",

  // CART
  cart_item_added: "retail_cart_events",
  cart_item_removed: "retail_cart_events",
  cart_update: "retail_cart_events",

  // CHECKOUT
  checkout_started: "retail_checkout_events",
  address_selected: "retail_checkout_events",
  delivery_option_selected: "retail_checkout_events",
  payment_method_selected: "retail_checkout_events",
  checkout_abandoned: "retail_checkout_events",

  // PAYMENT
  payment_initiated: "retail_payment_events",
  payment_success: "retail_payment_events",
  payment_failed: "retail_payment_events",
  payment_retry: "retail_payment_events",

  // ORDER
  order_created: "retail_order_events",
  order_confirmed: "retail_order_events",
  order_cancelled: "retail_order_events",
  order_status_updated: "retail_order_events",

  // FULFILLMENT
  inventory_reserved: "retail_fulfillment_events",
  inventory_released: "retail_fulfillment_events",
  shipment_created: "retail_fulfillment_events",
  order_packed: "retail_fulfillment_events",
  order_shipped: "retail_fulfillment_events",

  // DELIVERY
  in_transit: "retail_delivery_events",
  out_for_delivery: "retail_delivery_events",
  delivered: "retail_delivery_events",
  delivery_failed: "retail_delivery_events",

  // RETURNS + REFUNDS
  return_requested: "retail_return_events",
  return_approved: "retail_return_events",
  return_rejected: "retail_return_events",
  return_picked_up: "retail_return_events",
  return_received: "retail_return_events",
  refund_initiated: "retail_return_events",
  refund_success: "retail_return_events",
  refund_failed: "retail_return_events",

  // REVIEWS
  review_added: "retail_review_events",
  rating_given: "retail_review_events",

  // COUPONS
  coupon_viewed: "retail_coupon_events",
  coupon_applied: "retail_coupon_events",
  coupon_removed: "retail_coupon_events",
  coupon_rejected: "retail_coupon_events",

  // SYSTEM
  invoice_generated: "retail_system_events",
  notification_created: "retail_system_events",

  // ADMIN
  admin_login: "retail_admin_events",
  admin_login_failed: "retail_admin_events",
  admin_dashboard_viewed: "retail_admin_events",
};

export function getKafkaTopic(eventType: string): string {
  return topicMap[eventType] ?? "retail_dead_letter";
}