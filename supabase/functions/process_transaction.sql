-- Run this in your Supabase SQL Editor

create or replace function process_transaction(
  p_transaction jsonb,
  p_items jsonb[]
)
returns jsonb
language plpgsql
as $$
declare
  v_transaction_id uuid;
  v_item jsonb;
  v_trx_record record;
  v_stock int;
  v_track_stock boolean;
begin
  -- 1. Insert Transaction Data
  insert into transactions (
    branch_id, cashier_id, cashier_name, customer_name,
    total_amount, payment_method, amount_paid, change_amount,
    status, shift_session_id, transaction_code
  ) values (
    (p_transaction->>'branchId')::uuid,
    (p_transaction->>'cashierId')::uuid,
    p_transaction->>'cashierName',
    p_transaction->>'customerName',
    (p_transaction->>'totalAmount')::numeric,
    p_transaction->>'paymentMethod',
    (p_transaction->>'amountPaid')::numeric,
    (p_transaction->>'changeAmount')::numeric,
    p_transaction->>'status',
    (p_transaction->>'shiftSessionId')::uuid,
    p_transaction->>'transactionCode'
  )
  returning id, created_at, transaction_code into v_transaction_id, v_trx_record.created_at, v_trx_record.transaction_code;

  -- 2. Process Items (Insert & Update Stock)
  foreach v_item in array p_items
  loop
    -- Insert Transaction Item
    insert into transaction_items (
      transaction_id, product_id, product_name, variant_name,
      quantity, price, subtotal
    ) values (
      v_transaction_id,
      (v_item->>'productId')::uuid,
      v_item->>'productName',
      v_item->>'variant',
      (v_item->>'quantity')::int,
      (v_item->>'price')::numeric,
      (v_item->>'subtotal')::numeric
    );

    -- Update Stock (Atomic Decrement)
    -- Only update if track_stock is true
    select stock, track_stock into v_stock, v_track_stock
    from products
    where id = (v_item->>'productId')::uuid;

    if v_track_stock = true then
      update products
      set stock = stock - (v_item->>'quantity')::int
      where id = (v_item->>'productId')::uuid;
    end if;

  end loop;

  -- Return the created transaction data
  return jsonb_build_object(
    'id', v_transaction_id,
    'date', v_trx_record.created_at,
    'transactionCode', v_trx_record.transaction_code,
    'status', 'completed'
  );
end;
$$;
