import { parseCreditAmount } from "./creditMath";

const toObject = (value) => (value && typeof value === "object" ? value : {});

const pickPayload = (error) => {
  const data = toObject(error?.data);
  if (data.code || data.errorCode || data.required !== undefined) return data;
  if (toObject(data.detail).code) return toObject(data.detail);
  if (typeof data.detail === "string") return { message: data.detail };
  return data;
};

export const parseCreditError = (error) => {
  if (!error) return null;

  const status = Number(error?.status ?? error?.originalStatus ?? 0);
  const payload = pickPayload(error);
  const code = String(payload.code || payload.errorCode || "").toUpperCase();

  if (status === 402 || code === "INSUFFICIENT_CREDITS") {
    const required = parseCreditAmount(payload.required);
    const available = parseCreditAmount(payload.available);
    const shortfall = parseCreditAmount(payload.shortfall ?? required - available);
    return {
      type: "INSUFFICIENT_CREDITS",
      required,
      available,
      shortfall: Math.max(shortfall, 0),
      message: payload.message,
    };
  }

  if (status === 409 || code === "ACTION_DISABLED") {
    return {
      type: "ACTION_DISABLED",
      message:
        payload.message ||
        "This action is currently unavailable for your organisation.",
    };
  }

  if (code === "ACTION_INACTIVE") {
    return {
      type: "ACTION_INACTIVE",
      message: payload.message || "This action has been retired.",
    };
  }

  return null;
};
