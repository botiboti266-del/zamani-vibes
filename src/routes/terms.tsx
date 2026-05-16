import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  component: () => (
    <div className="mx-auto max-w-3xl px-4 py-16 prose prose-invert">
      <h1 className="font-display text-4xl">Terms of Use</h1>
      <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
      <p>By using Sauti ya Zamani you agree to these terms.</p>
      <h2 className="font-display text-2xl mt-8">Content</h2>
      <p className="text-muted-foreground">All podcasts on this platform are original works produced by Sauti ya Zamani. We do not upload copyrighted songs. Blog content, comments, and user-submitted material remain the property of their authors but you grant us a license to host and display them.</p>
      <h2 className="font-display text-2xl mt-8">Acceptable use</h2>
      <p className="text-muted-foreground">No harassment, spam, illegal content, or attempts to disrupt the service. Accounts violating these terms may be removed.</p>
      <h2 className="font-display text-2xl mt-8">Contact</h2>
      <p className="text-muted-foreground">Questions? <a href="mailto:omaryw003@gmail.com" className="text-primary">omaryw003@gmail.com</a></p>
    </div>
  ),
  head: () => ({ meta: [{ title: "Terms — Sauti ya Zamani" }] }),
});
