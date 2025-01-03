import { FilterDescriptor } from "devextreme/data";
import CustomStore, {
  Options as CustomStoreOptions,
} from "devextreme/data/custom_store";

// type PaginationResponse<T> = {
//   code: number;
//   data: {
//     items: T[];
//     total: number;
//     summary: number;
//   };
// };

// type NetWorkResponse<T> = {
//   ok: boolean;
//   statusText: string;
//   json: () => T;
// };

// function handleErrors<T>(response: NetWorkResponse<T>) {
//   if (!response.ok) {
//     throw Error(response.statusText);
//   }
//   return response;
// }
//
export const capitalizeFirstLetter = (string: string) => {
  return (string && string[0].toUpperCase() + string.slice(1)) || "";
};

const processNegations = (negationGroup: [string, string, unknown][]) => {
  for (const subFilter of negationGroup)
    if (Array.isArray(subFilter)) {
      subFilter[1] = "!=";
    }
};

const createFilterColumn = (filter: FilterDescriptor | FilterDescriptor[]) => {
  const map: Record<
    string,
    { column: string; expression: string; keySearch: string[] }
  > = {};
  if (!filter) return [];

  // try {
  const queue = filter.length === 3 ? [[...filter]] : [...filter];

  for (let i = 0; i < queue.length; i++) {
    const item = queue[i];

    if (item === "!" && queue[i + 1]) {
      processNegations(queue[i + 1]);
    }

    if (item[0] === "!" && item[1]) {
      processNegations(item[1]);
    }

    if (typeof item[0] === "string" && !["a", "o", "!"].includes(item[0])) {
      const [column, expression, keySearch] = item;

      if (!keySearch) continue;

      const operation = expression === "=" ? "IN" : "NOT IN";

      if (!map[column]) {
        map[column] = {
          column: capitalizeFirstLetter(column),
          expression: operation,
          keySearch: [keySearch],
        };
      } else {
        map[column].keySearch.push(keySearch);
      }
    } else if (Array.isArray(item)) {
      queue.push(...item);
    }
  }

  return Object.values(map).map((item) => ({
    ...item,
    keySearch: `(${item.keySearch.toString()})`,
  }));
  // } catch (error) {
  //   console.log("error:", error);
  // }
};

const token =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwcmltYXJ5c2lkIjoiNTkiLCJ1bmlxdWVfbmFtZSI6ImFkbWluIiwiZ3JvdXBzaWQiOiIxMiIsIkludm9pY2VDb25maWdJZCI6IjAiLCJCcmFuY2hJZHMiOiIiLCJTdGFmZklkIjoiMzMiLCJXYXJlaG91c2VJZHMiOiIiLCJVc2VyQ2FzaGllcklkcyI6IjIwMCw1OSIsIlBheW1lbnRUeXBlSWQiOiIyIiwibmJmIjoxNzMzNzM3MzUxLCJleHAiOjE3MzYzMjkzNTEsImlhdCI6MTczMzczNzM1MX0.Zo-Hu5CRQjEMzb-5S-0R7LPgzjZFFlzeCHl3DmqsBLI";

export const request = async (url: string, options?: RequestInit) => {
  return fetch(`https://api-restaurant-dev.phanmemviet.net.vn${url}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    ...options,
  })
    .then((response) => response.json())
    .catch(() => {
      throw "Network error";
    });
};

export const createPaginationFiltersStore = <T extends { id: string | number }>(
  url: string,
  key?: keyof T,
  options?: CustomStoreOptions,
) => {
  return new CustomStore({
    key: (key as string) || "id",
    load: async (loadOptions) => {
      const { skip = 0, take = 1, filter } = loadOptions;
      const filterColumn = createFilterColumn(filter) || [
        { column: "string", keySearch: "string", expression: "string" },
      ];
      return (
        request(`${url}/get-all`, {
          method: "POST",
          body: JSON.stringify({
            filterColumn,
            pageIndex: skip / take + 1,
            pageSize: take,
            sortColumn: "Id",
            sortOrder: 0,
            isPage: false,
          }),
        })
          // .then((response: NetWorkResponse<PaginationResponse<T>>) =>
          //   handleErrors(response),
          // )
          .then((response) => {
            return {
              data: response.data.items,
              totalCount: response.data.total,
              summary: response.data.summary,
            };
          })
      );
    },
    byKey: (key) => request(`${url}/${key}`),
    ...options,
  });
};

export const createQueryComponent = (url: string) => {
  const store = new CustomStore({
    key: "id",
    load: async (loadOptions) => {
      const { skip = 0, take = 10, searchValue } = loadOptions;

      const params = new URLSearchParams({
        id: "0",
        keySearch: searchValue || "",
        pageIndex: `${Math.floor(skip / take) + 1}`,
        pageSize: `${take}`,
        isGetAll: "true",
      }).toString();

      // fetch(`https://api-restaurant-dev.phanmemviet.net.vn${url}?${params}`, {
      //   headers: {
      //     Authorization: `Bearer ${token}`,
      //     Accept: "application/json",
      //     "Content-Type": "application/json",
      //   },
      // })
      //   // .then((response) =>
      //   //   handleErrors(response as unknown as FetchResponse<T>),
      //   // )
      return request(`${url}/get-component?${params}`).then((response) => {
        return {
          data: response.data.items,
          totalCount: response.data.total,
          summary: response.data.summary,
        };
      });
    },
    byKey(key) {
      return request(`${url}/${key}`, { method: "GET" });
    },
  });

  return store;
};
