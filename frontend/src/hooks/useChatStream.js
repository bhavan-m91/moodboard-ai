import { useCallback, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { streamChat } from "../services/searchService";
import {
  clearResults,
  setSearching,
  setQueries,
  addImage,
  updateImageTags,
  setError,
  setChatExplanation,
  addChatMessage,
} from "../store/searchSlice";

/**
 * Custom hook that drives the SSE chat refinement flow,
 * dispatching Redux actions for each event type.
 */
export function useChatStream() {
  const dispatch = useDispatch();
  const state = useSelector((s) => s.search);
  const projectName = useSelector((s) => s.wishlist.projectName);
  const includeInternal = useSelector((s) => s.search.includeInternal);
  const abortRef = useRef(null);

  const startChat = useCallback(
    async (followUpText) => {
      // Abort any in-flight search
      if (abortRef.current) {
        abortRef.current.abort = true;
      }
      const controller = { abort: false };
      abortRef.current = controller;

      dispatch(setSearching(true));
      dispatch(addChatMessage({ role: "user", text: followUpText }));

      // Derive unique tags from current images
      const currentTagsSet = new Set();
      state.images.forEach(img => {
        (img.tags || []).forEach(tag => currentTagsSet.add(tag));
      });
      const currentTags = Array.from(currentTagsSet);

      try {
        for await (const event of streamChat(state.prompt, followUpText, currentTags, projectName, includeInternal)) {
          if (controller.abort) break;

          switch (event.type) {
            case "chat_response":
              if (event.mode === "replace") {
                dispatch(clearResults());
              }
              if (event.explanation) {
                dispatch(setChatExplanation(event.explanation));
              }
              break;
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
              dispatch(setError(event.message || "Chat refinement failed"));
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
    [dispatch, state.prompt, state.images, projectName, includeInternal]
  );

  const cancelChat = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort = true;
    }
    dispatch(setSearching(false));
  }, [dispatch]);

  return { startChat, cancelChat };
}
