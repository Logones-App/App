-- Retrait de products.stock_tracking_mode : granularité via product_stocks + inventory_tracked par ligne de composition.

alter table public.products drop constraint if exists products_stock_tracking_mode_check;

alter table public.products drop column if exists stock_tracking_mode;
