"use client";

import Link from "next/link";
import { ProductsSection, StaffSection, SummarySection, UsersSection, VouchersSection } from "./admin";
import { DiningRoom, PaymentsSection } from "./floor";
import { Jump } from "./kit";
import { AllOrders, OrderBoard } from "./orders";
import { IngredientsSection, InventorySection, LotsSection, NotificationsSection, RecipesSection, SuppliersSection } from "./stock";
import styles from "./dashboard.module.css";

export function AdminDashboard() {
  return (
    <>
      <Jump
        items={[
          ["summary", "Summary"],
          ["orders", "Orders"],
          ["products", "Menu"],
          ["users", "Accounts"],
          ["staff", "Staff"],
          ["vouchers", "Vouchers"],
          ["inventory", "Inventory"],
          ["suppliers", "Suppliers"],
          ["notifications", "Notifications"],
        ]}
      />
      <p className={`t-small muted ${styles.lede}`}>
        Payments, bookings and the queue are on the <Link className={styles.inlineLink} href="/dashboard/cashier">Cashier</Link> page; tables, stock lots and
        ingredients on <Link className={styles.inlineLink} href="/dashboard/staff">Dining room and stock</Link>.
      </p>
      <SummarySection />
      <AllOrders />
      <ProductsSection />
      <UsersSection />
      <StaffSection />
      <VouchersSection />
      <InventorySection />
      <SuppliersSection />
      <NotificationsSection />
    </>
  );
}

export function KitchenDashboard() {
  return (
    <>
      <Jump items={[["orders", "Order queue"], ["inventory", "Inventory"], ["recipes", "Recipes"], ["ingredients", "Ingredients"], ["notifications", "Notifications"]]} />
      <OrderBoard kind="kitchen" />
      <InventorySection />
      <RecipesSection />
      <IngredientsSection />
      <NotificationsSection />
    </>
  );
}

export function CashierDashboard() {
  return (
    <>
      <Jump items={[["payments", "Payments"], ["reservations", "Reservations"], ["queue", "Walk-in queue"], ["tables", "Tables"]]} />
      <PaymentsSection />
      <DiningRoom />
    </>
  );
}

export function DeliveryDashboard() {
  return <OrderBoard kind="delivery" />;
}

export function StaffDashboard() {
  return (
    <>
      <Jump
        items={[
          ["reservations", "Reservations"],
          ["queue", "Walk-in queue"],
          ["tables", "Tables"],
          ["inventory", "Inventory"],
          ["lots", "Stock lots"],
          ["ingredients", "Ingredients"],
          ["suppliers", "Suppliers"],
          ["notifications", "Notifications"],
        ]}
      />
      <DiningRoom />
      <InventorySection />
      <LotsSection />
      <IngredientsSection />
      <SuppliersSection />
      <NotificationsSection />
    </>
  );
}
