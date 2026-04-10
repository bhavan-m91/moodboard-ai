import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  prompt: "",
  isSearching: false,
  queries: [],
  images: [],
  error: null,
  chatHistory: [],
  chatExplanation: "",
  includeInternal: false,
};

const searchSlice = createSlice({
  name: "search",
  initialState,
  reducers: {
    setPrompt(state, action) {
      state.prompt = action.payload;
    },
    setSearching(state, action) {
      state.isSearching = action.payload;
    },
    setIncludeInternal(state, action) {
      state.includeInternal = action.payload;
    },
    addChatMessage(state, action) {
      state.chatHistory.push(action.payload);
    },
    setChatExplanation(state, action) {
      state.chatExplanation = action.payload;
    },
    addImage(state, action) {
      const existing = state.images.find((i) => i.id === action.payload.id);
      if (!existing) {
        state.images.push(action.payload);
      }
    },
    updateImageTags(state, action) {
      const updated = action.payload;
      const idx = state.images.findIndex((i) => i.id === updated.id);
      if (idx !== -1) {
        state.images[idx] = {
          ...state.images[idx],
          tags: updated.tags ?? state.images[idx].tags,
          caption: updated.caption ?? state.images[idx].caption,
          style_label: updated.style_label ?? state.images[idx].style_label,
          color_palette: updated.color_palette ?? state.images[idx].color_palette,
          mood: updated.mood ?? state.images[idx].mood,
          tagging_complete: updated.tagging_complete ?? true,
        };
      }
    },
    setQueries(state, action) {
      state.queries = action.payload;
    },
    setError(state, action) {
      state.error = action.payload;
      state.isSearching = false;
    },
    clearResults(state) {
      state.images = [];
      state.queries = [];
      state.error = null;
      state.chatExplanation = "";
    },
  },
});

export const {
  setPrompt,
  setSearching,
  setIncludeInternal,
  addChatMessage,
  setChatExplanation,
  addImage,
  updateImageTags,
  setQueries,
  setError,
  clearResults,
} = searchSlice.actions;

export default searchSlice.reducer;
