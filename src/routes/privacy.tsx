import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  component: () => (
    <div className="mx-auto max-w-3xl px-4 py-16 prose prose-invert">
      <h1 className="font-display text-4xl">Privacy Policy</h1>
      <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
      <p>Sauti ya Zamani respects your privacy. This policy explains what we collect and why.</p>
      <h2 className="font-display text-2xl mt-8">What we collect</h2>
      <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
        <li>Email and display name when you create an account.</li>
        <li>Comments, likes, and listening history tied to your account.</li>
        <li>Contact form submissions and newsletter signups.</li>
        <li>Basic, anonymized analytics about which episodes are popular.</li>
      </ul>
      <h2 className="font-display text-2xl mt-8">How we use it</h2>
      <p className="text-muted-foreground">Only to run the platform — your data is never sold. Email is used only for service emails and the newsletter you opted into.</p>
      <h2 className="font-display text-2xl mt-8">Your rights</h2>
      <p className="text-muted-foreground">Email <a href="mailto:omaryw003@gmail.com" className="text-primary">omaryw003@gmail.com</a> to access, export, or delete your data.</p>
    </div>
  ),
  head: () => ({ meta: [{ title: "Privacy — Sauti ya Zamani" }] }),
});
