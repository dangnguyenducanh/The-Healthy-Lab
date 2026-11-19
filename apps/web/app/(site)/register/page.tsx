import Image from "next/image";
import { Closing } from "@/components/site/Closing";
import { RegisterForm } from "./RegisterForm";

export const metadata = { title: "Create an account" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const { next } = await searchParams;
  return (
    <>
      <main id="main">
        <section className="section" aria-labelledby="register-h" style={{ height: "auto", minHeight: "100svh" }}>
          <div className="wrap">
            <div className="grid grid--top">
              <div className="span-5 stack-6">
                <h1 id="register-h">Create an account</h1>
                <RegisterForm next={typeof next === "string" ? next : undefined} />
              </div>
              <figure className="pl-photo pl-photo--end span-6 start-7" style={{ ["--pl-r" as string]: 1 }}>
                <Image src="/images/bento-fruit-bg.jpg" alt="Yogurt bowl with berries, mango and granola" width={1024} height={1024} quality={70} sizes="(max-width: 1023px) 100vw, 628px" preload />
              </figure>
            </div>
          </div>
        </section>
      </main>
      <Closing />
    </>
  );
}
