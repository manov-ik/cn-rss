import useSWRInfinite from "swr/infinite";
import { useBearStore } from "@/stores";
import { request } from "@/helpers/request";
import { useMatch } from "react-router-dom";
import { RouteConfig } from "@/config";
import { omit } from "lodash";
import { ArticleResItem } from "@/db";
import { useMemo, useCallback } from "react";
import { useShallow } from "zustand/react/shallow";

const PAGE_SIZE = 20;

export interface UseArticleProps {
  feedUuid?: string;
  type?: string;
}

export function useArticle(props: UseArticleProps) {
  const { feedUuid, type } = props;
  const isToday = useMatch(RouteConfig.LOCAL_TODAY);
  const isAll = useMatch(RouteConfig.LOCAL_ALL);
  const isStarred = useMatch(RouteConfig.LOCAL_STARRED);

  const store = useBearStore(
    useShallow((state) => ({
      currentFilter: state.currentFilter,
      updateArticleStatus: state.updateArticleStatus,
    })),
  );

  const query = useMemo(() => {
    const isTodayVal = isToday ? 1 : undefined;
    const isAllVal = isAll ? 1 : undefined;
    const isStarredVal = isStarred ? 1 : undefined;
    return omit({
      read_status: isStarred ? undefined : store.currentFilter.id,
      limit: PAGE_SIZE,
      feed_uuid: feedUuid,
      item_type: type,
      is_today: isTodayVal,
      is_all: isAllVal,
      is_starred: isStarredVal,
    });
  }, [
    feedUuid,
    type,
    isToday,
    isAll,
    isStarred,
    store.currentFilter.id,
  ]);

  const getKey = useCallback(
    (pageIndex: number, previousPageData: any) => {
      if (previousPageData && !previousPageData.list?.length)
        return null; // 已经到最后一页

      return {
        ...query,
        cursor: pageIndex + 1,
      }; // SWR key
    },
    [query],
  );
  const { data, isLoading, size, mutate, setSize } = useSWRInfinite(
    getKey,
    (q) =>
      request
        .get("/articles", {
          params: { ...q },
        })
        .then((res) => res.data),
    {
      revalidateIfStale: false,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 1000,
    },
  );

  const list = data
    ? data.reduce((acu, cur) => acu.concat(cur.list || []), [])
    : [];

  const DUMMY_ARTICLES = [
    {
      uuid: "dummy-1",
      title: "Understanding Mobile Responsiveness",
      description: "Responsive web design makes web pages render well on a variety of devices, including mobile. This is a dummy article perfectly suited for visually testing the layout transition between the feed list and this reading view.",
      content: "<p>Responsive web design makes web pages render well on a variety of devices, including mobile. This is a dummy article perfectly suited for visually testing the layout transition between the feed list and this reading view.</p><p>Try clicking the back button above to return.</p>",
      link: "https://example.com/dummy-1",
      pub_date: new Date().toISOString(),
      read_status: 1,
      feed_uuid: "dummy-feed",
      feed_title: "Development Testing Feed",
      feed_url: "https://example.com/rss",
      image: "",
      author: "Test User",
      channel_title: "Development Testing Feed"
    },
    {
      uuid: "dummy-2",
      title: "The Joy of Building CSS UIs",
      description: "This is the second dummy article to check the list view items.",
      content: "<p>This is the second dummy article to check the list view items.</p>",
      link: "https://example.com/dummy-2",
      pub_date: new Date(Date.now() - 86400000).toISOString(),
      read_status: 1,
      feed_uuid: "dummy-feed",
      feed_title: "Development Testing Feed",
      feed_url: "https://example.com/rss",
      image: "",
      author: "Test User",
      channel_title: "Development Testing Feed"
    }
  ];

  const articles: ArticleResItem[] = list && list.length > 0 ? [].concat(list) : (DUMMY_ARTICLES as any[]);
  const isEmpty = false;
  const isReachingEnd = true;

  return {
    articles,
    isLoading,
    mutate,
    size,
    setSize,
    isEmpty,
    isReachingEnd,
    isToday: !!isToday,
    isAll: !!isAll,
    isStarred: !!isStarred,
  };
}
