import { useCallback, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { streamSearch } from "../services/searchService";
import {
  clearResults,
  setSearching,
  setQueries,
  addImage,
  updateImageTags,
  setError,
} from "../store/searchSlice";

/**
 * Custom hook that drives the SSE search flow,
 * dispatching Redux actions for each event type.
 */
export function useSearchStream() {
  const dispatch = useDispatch();
  const projectName = useSelector((s) => s.wishlist.projectName);
  const includeInternal = useSelector((s) => s.search.includeInternal);
  const abortRef = useRef(null);

  const startSearch = useCallback(
    async (prompt) => {
      // Abort any in-flight search
      if (abortRef.current) {
        abortRef.current.abort = true;
      }
      const controller = { abort: false };
      abortRef.current = controller;

      dispatch(clearResults());
      dispatch(setSearching(true));

      try {
        for await (const event of streamSearch(prompt, projectName, includeInternal)) {
          if (controller.abort) break;

          switch (event.type) {
            case "queries":
              dispatch(setQueries(event.data));
              break;
            case "image":
              dispatch(addImage(event.data));
              break;
            case "tag_update":
              dispatch(updateImageTags(event.data));
              break;
            case "error":
              dispatch(setError(event.message || "Search failed"));
              break;
            case "done":
              // Stream complete
              break;
            default:
              break;
          }
        }
      } catch (err) {
        if (!controller.abort) {
          dispatch(setError(err.message));
        }
      } finally {
        if (!controller.abort) {
          dispatch(setSearching(false));
        }
      }
    },
    [dispatch, projectName, includeInternal]
  );

  const cancelSearch = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort = true;
    }
    dispatch(setSearching(false));
  }, [dispatch]);

  return { startSearch, cancelSearch };
}
