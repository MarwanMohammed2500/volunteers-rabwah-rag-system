import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

type SidebarProps = {
  activeNamespace: string | null;
  setActiveNamespace: (ns: string) => void;
};

export function Sidebar({ activeNamespace, setActiveNamespace }: SidebarProps) {
  const { data, isLoading, error } = useQuery<{ namespaces?: string[] }>({
    queryKey: ["/api/chat/namespaces"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/chat/namespaces");
      if (!res.ok) throw new Error("Failed to fetch namespaces");

      const json = await res.json();
      console.log("✅ Namespaces data:", json);
      return json;
    },
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });

  if (isLoading) return <div className="p-4">Loading namespaces...</div>;
  if (error) return <div className="p-4 text-red-500">Error loading namespaces</div>;

  // Normalize namespaces
  const namespaces = Array.isArray(data?.namespaces)
    ? data!.namespaces
    : Array.isArray(data)
    ? (data as unknown as string[]) // backend might return plain array
    : [];

  return (
    <div className="w-64 border-r border-neutral-200 bg-white h-full overflow-y-auto">
      <div className="p-4 font-bold">Namespaces</div>
      <ul>
        {namespaces.length > 0 ? (
          namespaces.map((ns) => (
            <li
              key={ns}
              onClick={() => setActiveNamespace(ns)}
              className={`cursor-pointer px-4 py-2 hover:bg-neutral-100 ${
                ns === activeNamespace ? "bg-neutral-200 font-semibold" : ""
              }`}
            >
              {ns}
            </li>
          ))
        ) : (
          <li className="px-4 py-2 text-neutral-400 italic">
            No namespaces found
          </li>
        )}
      </ul>
    </div>
  );
}