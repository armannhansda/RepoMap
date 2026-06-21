"use client";

import { useEffect } from "react";
import Clarity from "@microsoft/clarity";

export default function ClarityProvider() {
  useEffect(() => {
    if (typeof window !== "undefined") {
      Clarity.init("xajm82cz1i");
    }
  }, []);

  return null;
}
