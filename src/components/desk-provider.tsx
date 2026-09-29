"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { demoClaim } from "@/lib/demo-tour";
import { initialClaims, PEOPLE, type Claim, type Person } from "@/lib/claims";

const STORAGE_KEY = "smb-work-hub-claims-v7";

function startingClaims() {
  return [demoClaim(0), ...initialClaims];
}

const DeskContext = createContext<{
  person: Person;
  setPersonId: (id: string) => void;
  claims: Claim[];
  setClaims: React.Dispatch<React.SetStateAction<Claim[]>>;
  resetClaims: () => void;
} | null>(null);

export function DeskProvider({ children }: { children: React.ReactNode }) {
  const [personId, setPersonId] = useState("demo");
  const [claims, setClaims] = useState<Claim[]>(startingClaims);
  const loaded = useRef(false);
  const person = PEOPLE.find((item) => item.id === personId) ?? PEOPLE[0];

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          setClaims(JSON.parse(saved) as Claim[]);
        } catch {
          window.localStorage.removeItem(STORAGE_KEY);
        }
      }
      loaded.current = true;
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(claims));
  }, [claims]);

  function resetClaims() {
    window.localStorage.removeItem(STORAGE_KEY);
    setClaims(startingClaims());
  }

  return (
    <DeskContext.Provider value={{ person, setPersonId, claims, setClaims, resetClaims }}>
      {children}
    </DeskContext.Provider>
  );
}

export function useDesk() {
  const value = useContext(DeskContext);
  if (!value) throw new Error("useDesk must be used inside DeskProvider");
  return value;
}
