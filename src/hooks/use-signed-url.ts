import { useQuery } from "@tanstack/react-query";
import { getSignedUrl } from "@/lib/storage";

export function useSignedUrl(path?: string | null) {
  return useQuery({
    queryKey: ["signed-url", path],
    queryFn: () => getSignedUrl(path as string),
    enabled: Boolean(path),
    staleTime: 1000 * 60 * 30,
  });
}
