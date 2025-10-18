import { createFileRoute } from "@tanstack/react-router";
import { Context, Effect, Layer, Schema } from "@celestial/effect";
export class User extends Schema.Class<User>("User")({
  id: Schema.String, // User's ID as a string
  name: Schema.String, // User's name as a string
}) {}
