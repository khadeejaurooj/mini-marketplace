// =====================================================================
// POST /api/checkout  (runs on the SERVER)
// 1. Checks the caller is a logged-in buyer.
// 2. For every cart line, loads the product + options from the DATABASE and
//    re-calculates the price (never trusts a price sent by the browser).
// 3. Groups lines by seller -> one order per seller.
// 4. Saves orders + order_items with the service key.
// =====================================================================
import { NextResponse } from 'next/server';
import { supabaseAdmin, getUserFromRequest } from '@/lib/supabaseServer';
import { calculatePrice, titleWithColour, GROUP_LABELS, REQUIRED_GROUPS, round2 } from '@/lib/price';

const fail = (message, status = 400) => NextResponse.json({ error: message }, { status });

export async function POST(request) {
  const buyer = await getUserFromRequest(request);
  if (!buyer || buyer.role !== 'buyer') return fail('Please log in as a buyer.', 401);

  const { items, customer_name, address } = await request.json();
  if (!items?.length) return fail('Your basket is empty.');
  if (!customer_name || !address) return fail('Name and address are required.');

  const ordersBySeller = {}; // sellerId -> list of order_items

  for (const item of items) {
    // Load the product - must be live and from an approved seller.
    const { data: product } = await supabaseAdmin
      .from('products').select('*, seller:profiles(status)').eq('id', item.productId).single();
    if (!product || product.status !== 'active' || product.seller?.status !== 'approved') {
      return fail('A product in your basket is no longer available.');
    }
    const { data: options } = await supabaseAdmin
      .from('product_options').select('*').eq('product_id', product.id);

    // Every chosen option must belong to THIS product...
    const chosen = options.filter((o) => item.optionIds.includes(o.id));
    if (chosen.length !== item.optionIds.length) return fail('Invalid option selected.');

    // ...and each required group needs exactly one choice.
    const labels = {};
    for (const group of REQUIRED_GROUPS) {
      const inGroup = chosen.filter((o) => o.group_name === group);
      const groupExists = options.some((o) => o.group_name === group);
      if (groupExists && inGroup.length !== 1) return fail(`Please choose one ${GROUP_LABELS[group]}.`);
      if (inGroup[0]) labels[GROUP_LABELS[group]] = inGroup[0].name;
    }
    const addonNames = chosen.filter((o) => o.group_name === 'addon').map((o) => o.name);
    labels[GROUP_LABELS.addon] = addonNames.length ? addonNames.join(', ') : 'None';

    const quantity = Math.max(1, parseInt(item.quantity, 10) || 1);
    const unitPrice = calculatePrice(product, options, item.optionIds);

    if (!ordersBySeller[product.seller_id]) ordersBySeller[product.seller_id] = [];
    ordersBySeller[product.seller_id].push({
      product_id: product.id,
      title: titleWithColour(product.title, labels.Colour),
      options: labels,
      unit_price: unitPrice,
      quantity,
    });
  }

  // Save one order per seller, then its items.
  const orderIds = [];
  for (const [sellerId, orderItems] of Object.entries(ordersBySeller)) {
    const total = round2(orderItems.reduce((sum, i) => sum + i.unit_price * i.quantity, 0));
    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .insert({ buyer_id: buyer.id, seller_id: sellerId, customer_name, address, total })
      .select()
      .single();
    if (error) return fail(error.message, 500);

    const { error: itemsError } = await supabaseAdmin
      .from('order_items')
      .insert(orderItems.map((i) => ({ ...i, order_id: order.id })));
    if (itemsError) return fail(itemsError.message, 500);
    orderIds.push(order.id);
  }

  return NextResponse.json({ orderIds });
}
