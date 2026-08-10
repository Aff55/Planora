import { useState } from "react";
import {
  Pressable,
  Text,
  View
} from "react-native";
import type { SearchResult } from "../types";
import { ScreenName, colors } from "../theme";
import { searchResultScreen } from "../utils";
import { Card, SectionTitle, Input, Button, Empty } from "../ui";
import { styles } from "../styles";

export function SearchScreen({
  palette,
  api,
  setScreen
}: {
  palette: ReturnType<typeof colors>;
  api: <T>(path: string, options?: RequestInit) => Promise<T>;
  setScreen: (screen: ScreenName) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function search() {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api<{ results: SearchResult[] }>(`/search?q=${encodeURIComponent(query.trim())}`);
      setResults(data.results);
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.stack}>
      <Card palette={palette}>
        <SectionTitle palette={palette} title="Search Planora" />
        <Input palette={palette} label="Keyword" value={query} onChangeText={setQuery} placeholder="Search tasks, life logs, journals, calendar..." />
        {error && <Text style={[styles.errorText, { color: palette.red }]}>{error}</Text>}
        <Button palette={palette} icon="search-outline" label={loading ? "Searching" : "Search"} onPress={() => void search()} disabled={!query.trim() || loading} />
      </Card>
      <Card palette={palette}>
        <SectionTitle palette={palette} title="Results" />
        {results.length === 0 ? (
          <Empty palette={palette} icon="search-outline" title="No results yet" body="Search for a task, meal, journal, or event." />
        ) : (
          results.map((item) => (
            <Pressable
              key={`${item.type}-${item.id}`}
              onPress={() => setScreen(searchResultScreen(item.type))}
              style={[styles.listItem, { borderColor: palette.border, backgroundColor: palette.soft }]}
            >
              <Text style={[styles.itemTitle, { color: palette.text }]}>{item.title}</Text>
              <Text style={[styles.itemMeta, { color: palette.muted }]}>{item.type}</Text>
            </Pressable>
          ))
        )}
      </Card>
    </View>
  );
}
