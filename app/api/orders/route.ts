import { supabaseServer } from '@/lib/supabase-server';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (
      !body.restaurant_id ||
      !body.table_id ||
      !Array.isArray(body.items) ||
      !body.items.length
    ) {
      return Response.json(
        { error: 'Invalid order' },
        { status: 400 }
      );
    }

    const s = await supabaseServer();

    const { data: r } = await s
      .from('restaurants')
      .select('id,is_active')
      .eq('id', body.restaurant_id)
      .single();

    if (!r?.is_active) {
      return Response.json(
        { error: 'Restaurant unavailable' },
        { status: 403 }
      );
    }

    const ids = body.items.map(
      (x: any) => x.menu_item_id
    );

    const { data: menus } = await s
      .from('menu_items')
      .select('id,name,price')
      .eq('restaurant_id', r.id)
      .in('id', ids)
      .eq('is_available', true);

    if (!menus || menus.length !== ids.length) {
      return Response.json(
        { error: 'Menu changed. Refresh and try again.' },
        { status: 400 }
      );
    }

    const normalized = body.items.map((x: any) => {
      const m = menus.find(
        (z: any) => z.id === x.menu_item_id
      );

      if (!m) {
        throw new Error('Menu item not found');
      }

      const q = Math.min(
        99,
        Math.max(1, Number(x.quantity) || 1)
      );

      return {
        menu_item_id: m.id,
        name: m.name,
        price: m.price,
        quantity: q,
      };
    });

    const total = normalized.reduce(
      (a: number, x: any) =>
        a + Number(x.price) * x.quantity,
      0
    );

    const { data: o, error } = await s
      .from('orders')
      .insert({
        restaurant_id: r.id,
        table_id: body.table_id,
        total,
        status: 'NEW',
      })
      .select('id')
      .single();

    if (error) {
      throw error;
    }

    const { error: ie } = await s
      .from('order_items')
      .insert(
        normalized.map((x: any) => ({
          ...x,
          order_id: o.id,
          restaurant_id: r.id,
        }))
      );

    if (ie) {
      throw ie;
    }

    return Response.json(
      {
        id: o.id,
        total,
      },
      { status: 201 }
    );
  } catch (e: any) {
    return Response.json(
      {
        error: e.message || 'Order failed',
      },
      { status: 500 }
    );
  }
}