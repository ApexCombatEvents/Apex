import { redirect } from "next/navigation";

/**
 * Legacy route kept for backwards compatibility.
 * The canonical create event flow is `/create-event`.
 */
export default function NewEventRedirect() {
  redirect("/create-event");
}
