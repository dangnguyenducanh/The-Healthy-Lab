"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart";
import type { Product } from "@/lib/types";

/** The menu tile's button: puts one of the product in the cart and says so for a few seconds. */
export function AddToCart({ product }: { product: Pick<Product, "id" | "name" | "price" | "image_url"> }) {
  const { add } = useCart();
  const [added, setAdded] = useState(0);

  useEffect(() => {
    if (!added) return;
    const t = setTimeout(() => setAdded(0), 4000);
    return () => clearTimeout(t);
  }, [added]);

  return (
    <div className="btn-row">
      <button
        className="btn btn--secondary"
        type="button"
        onClick={() => {
          add({ kind: "product", productId: product.id, name: product.name, price: product.price, image: product.image_url });
          setAdded((n) => n + 1);
        }}
      >
        Add to cart
      </button>
      <p className="form-note" data-tone="ok" role="status">
        {added > 0 && (
          <>
            Added to cart. <Link className="link" href="/cart">View cart</Link>
          </>
        )}
      </p>
    </div>
  );
}
