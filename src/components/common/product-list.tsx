"use client";

import { productTable, productVariantTable } from "@/db/schema";

import ProductItem from "./product-item";

interface ProductListProps {
  title: string;
  products: (typeof productTable.$inferSelect & {
    variants: (typeof productVariantTable.$inferSelect)[];
  })[];
}

const ProductList = ({ title, products }: ProductListProps) => {
  return (
    <div className="space-y-4">
      <h3 className="px-5 text-lg font-semibold">{title}</h3>
      <div className="relative px-5">
        {" "}
        {/* Container relativo para limitar a largura */}
        <div className="scrollbar-hide flex w-full gap-4 overflow-x-auto pb-4 whitespace-nowrap">
          {products.map((product) => (
            <div
              key={product.id}
              className="inline-flex w-48 flex-shrink-0" /* Mudamos para inline-flex */
            >
              <ProductItem product={product} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProductList;
