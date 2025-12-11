"use client";
import { useEffect, useMemo, useState } from "react";

const KEY = "ybg_wishlist";

function read() {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); }
  catch { return []; }
}
function write(items) {
  localStorage.setItem(KEY, JSON.stringify(items));
}

export default function useWishlist() {
  const [items, setItems] = useState([]);

  useEffect(() => { setItems(read()); }, []);
  useEffect(() => { write(items); }, [items]);

  const add = (item) => {
    setItems(prev => {
      const i = prev.findIndex(p => p.id === item.id);
      if (i >= 0) {
        const next = [...prev];
        next[i].qty = (next[i].qty || 1) + (item.qty || 1);
        return next;
      }
      return [...prev, { ...item, qty: item.qty || 1 }];
    });
  };

  const remove = (id) => setItems(prev => prev.filter(p => p.id !== id));
  const setQty  = (id, qty) => setItems(prev => prev.map(p => p.id === id ? { ...p, qty: Math.max(1, qty) } : p));
  const clear   = () => setItems([]);

  const subtotal = useMemo(() =>
    items.reduce((s, i) => s + (i.price || 0) * (i.qty || 1), 0)
  , [items]);

  return { items, add, remove, setQty, clear, subtotal };
}
