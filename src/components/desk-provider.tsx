"use client";

import { createContext, useContext, useState } from "react";
import { demoClaim } from "@/lib/demo-tour";
import { initialClaims, PEOPLE, type Claim, type Person } from "@/lib/claims";

const DeskContext = createContext<{
  person: Person;
  setPersonId: (id: string) => void;
  claims: Claim[];
  setClaims: React.Dispatch<React.SetStateAction<Claim[]>>;
} | null>(null);

export function DeskProvider({ children }: { children: React.ReactNode }) {
  const [personId, setPersonId] = useState("tracker");
  const [claims, setClaims] = useState<Claim[]>([demoClaim(0), ...initialClaims]);
  const person = PEOPLE.find((item) => item.id === personId) ?? PEOPLE[0];

  return (
    <DeskContext.Provider value={{ person, setPersonId, claims, setClaims }}>
      {children}
    </DeskContext.Provider>
  );
}

export function useDesk() {
  const value = useContext(DeskContext);
  if (!value) throw new Error("useDesk must be used inside DeskProvider");
  return value;
}
