import {
  Article,
  ArticleResItem,
  Channel,
  FeedResItem,
  FolderResItem,
} from "../db";
import { request } from "@/helpers/request";
import { AxiosRequestConfig, AxiosResponse } from "axios";

export const getChannels = async (
  filter: any,
): Promise<AxiosResponse<{ list: (Channel & { parent_uuid: String })[] }>> => {
  return request.get("feeds", {
    params: {
      filter,
    },
  });
};

export const getSubscribes = async (): Promise<
  AxiosResponse<FeedResItem[]>
> => {
  return request.get("subscribes");
};

export const createFolder = async (name: string): Promise<number> => {
  return request.post("create_folder", { name }).then((res) => res.data);
};

export const updateFolder = async (
  uuid: string,
  name: string,
): Promise<number> => {
  return request.post("update_folder", { uuid, name }).then((res) => res.data);
};

export const getFolders = async (): Promise<AxiosResponse<FolderResItem[]>> => {
  return request.get("folders", {});
};

export const updateFeedSort = async (
  sorts: {
    item_type: string;
    uuid: string;
    folder_uuid: string;
    sort: number;
  }[],
): Promise<any> => {
  return request.post("update-feed-sort", sorts);
};

export const moveChannelIntoFolder = async (
  channelUuid: string,
  folderUuid: string,
  sort: number,
): Promise<any> => {
  return request.post("move_channel_into_folder", {
    channelUuid,
    folderUuid,
    sort,
  }).then((res) => res.data);
};

/**
 * 删除频道
 * @param {String} uuid  channel 的 uuid
 */
export const deleteChannel = async (uuid: string) => {
  return request.delete(`feeds/${uuid}`);
};

export const deleteFolder = async (uuid: string) => {
  return request.post("delete_folder", { uuid }).then((res) => res.data);
};

export const getArticleList = async (filter: any) => {
  const req = request.get("articles", {
    params: {
      ...filter,
    },
  });

  return req;
};

export const fetchFeed = async (url: string): Promise<[any, string]> => {
  return request.post("fetch_feed", { url }).then((res) => res.data);
};

export const subscribeFeed = async (
  url: string,
): Promise<[FeedResItem, number, string]> => {
  return request.post("add_feed", { url }).then((res) => res.data);
};

export const syncFeed = async (
  feed_type: string,
  uuid: string,
): Promise<{ synced: boolean; newArticles: number; error?: string }> => {
  return request.get(`feeds/${uuid}/sync`, {
    params: {
      feed_type,
    },
  }).then((res) => res.data);
};

export const getUnreadTotal = async (): Promise<
  AxiosResponse<{ [key: string]: number }>
> => {
  return request.get("articles/unread-total");
};

export const getCollectionMetas = async (): Promise<
  AxiosResponse<{
    [key: string]: number;
  }>
> => {
  return request.get("articles/collection-metas");
};

export const updateArticleReadStatus = async (
  article_uuid: string,
  read_status: number,
) => {
  return request.post(`/articles/${article_uuid}/read`, {
    read_status,
  });
};

export const updateArticleStarStatus = async (
  article_uuid: string,
  star_status: number,
) => {
  return request.post(`/articles/${article_uuid}/star`, {
    starred: star_status,
  });
};

export const markAllRead = async (body: {
  uuid?: string;
  isToday?: boolean;
  isAll?: boolean;
}): Promise<AxiosResponse<number>> => {
  return request.post("articles/mark-all-as-read", body);
};

export const getUserConfig = async (): Promise<any> => {
  return request.get("/user-config");
};

export const updateUserConfig = async (cfg: any): Promise<any> => {
  return request.post("/user-config", cfg);
};

export const updateThreads = async (threads: number): Promise<any> => {
  return request.post("update_threads", { threads }).then((res) => res.data);
};

export const updateTheme = async (theme: string): Promise<any> => {
  return request.post("update_theme", { theme }).then((res) => res.data);
};

export const updateInterval = async (interval: number): Promise<any> => {
  return request.post("update_interval", { interval }).then((res) => res.data);
};

export const initProcess = async (): Promise<any> => {
  return request.post("init_process", {}).then((res) => res.data);
};

export const getArticleDetail = async (
  uuid: string,
  config: AxiosRequestConfig,
): Promise<AxiosResponse<ArticleResItem>> => {
  return request.get(`articles/${uuid}`, config);
};

export const getBestImage = async (
  url: String,
): Promise<AxiosResponse<string>> => {
  return request.get("articles/image-proxy", {
    params: {
      url,
    },
  });
};

export const getPageSources = async (
  url: string,
): Promise<AxiosResponse<string>> => {
  return request.get("articles/article-proxy", {
    params: {
      url,
    },
  });
};

export const updateIcon = async (
  uuid: String,
  url: string,
): Promise<string> => {
  return request.post("update_icon", { uuid, url }).then((res) => res.data);
};

export interface OpmlImportResult {
  folder_count: number;
  feed_count: number;
  failed_count: number;
  errors: string[];
}

/**
 * 导出所有订阅为 OPML 格式
 *
 * @returns {Promise<string>} OPML 格式的订阅数据
 */
export const exportOpml = async (): Promise<string> => {
  return request.post("export_opml", {}).then((res) => res.data);
};

/**
 * 从 OPML 内容导入订阅
 *
 * @param {string} opmlContent - OPML 格式的订阅数据
 * @returns {Promise<OpmlImportResult>} 导入结果，包含文件夹数量、订阅数量、失败数量和错误信息
 */
export const importOpml = async (
  opmlContent: string,
): Promise<OpmlImportResult> => {
  return request.post("import_opml", { opmlContent }).then((res) => res.data);
};
