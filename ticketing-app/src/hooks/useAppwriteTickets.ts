import { useCallback, useEffect, useState } from "react";

import { ticketsService } from "@/services";
import { Ticket } from "@/types/tickets";

interface UseAppwriteTicketsProps {
  initialFetch?: boolean;
}

interface UseAppwriteTicketsReturn {
  tickets: Ticket[];
  isLoading: boolean;
  error: Error | null;
  fetchTickets: () => Promise<void>;
  getTicket: (id: string) => Promise<Ticket | undefined>;
  createTicket: (ticketData: Omit<Ticket, "id">) => Promise<Ticket>;
  updateTicket: (id: string, ticketData: Partial<Ticket>) => Promise<Ticket>;
  deleteTicket: (id: string) => Promise<void>;
}

export function useAppwriteTickets({
  initialFetch = true,
}: UseAppwriteTicketsProps = {}): UseAppwriteTicketsReturn {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchTickets = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const fetchedTickets = await ticketsService.getAllTickets();
      setTickets(fetchedTickets);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch tickets"));
      console.error("Error fetching tickets:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getTicket = useCallback(async (id: string): Promise<Ticket | undefined> => {
    try {
      return await ticketsService.getTicket(id);
    } catch (err) {
      console.error(`Error fetching ticket ${id}:`, err);
      return undefined;
    }
  }, []);

  const createTicket = useCallback(
    async (ticketData: Omit<Ticket, "id">): Promise<Ticket> => {
      try {
        const newTicket = await ticketsService.createTicket(ticketData);
        setTickets((prevTickets) => [...prevTickets, newTicket]);
        return newTicket;
      } catch (err) {
        console.error("Error creating ticket:", err);
        throw err;
      }
    },
    [],
  );

  const updateTicket = useCallback(
    async (id: string, ticketData: Partial<Ticket>): Promise<Ticket> => {
      try {
        const updatedTicket = await ticketsService.updateTicket(id, ticketData);
        setTickets((prevTickets) =>
          prevTickets.map((ticket) => (ticket.id === id ? updatedTicket : ticket)),
        );
        return updatedTicket;
      } catch (err) {
        console.error(`Error updating ticket ${id}:`, err);
        throw err;
      }
    },
    [],
  );

  const deleteTicket = useCallback(async (id: string): Promise<void> => {
    try {
      await ticketsService.deleteTicket(id);
      setTickets((prevTickets) => prevTickets.filter((ticket) => ticket.id !== id));
    } catch (err) {
      console.error(`Error deleting ticket ${id}:`, err);
      throw err;
    }
  }, []);

  useEffect(() => {
    if (initialFetch) {
      fetchTickets();
    }
  }, [fetchTickets, initialFetch]);

  return {
    tickets,
    isLoading,
    error,
    fetchTickets,
    getTicket,
    createTicket,
    updateTicket,
    deleteTicket,
  };
}
