export type Restaurant={id:string;name:string;slug:string;description:string|null;is_active:boolean;};
export type MenuItem={id:string;restaurant_id:string;category_id:string|null;name:string;description:string|null;price:number;image:Record<string,string>|null;is_available:boolean;};
export type Order={id:string;restaurant_id:string;table_id:string;status:string;total:number;created_at:string;order_items?:any[];tables?:{name:string}};
