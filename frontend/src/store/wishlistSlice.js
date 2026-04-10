import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  projectName: "My Project",
  items: [],
  isOpen: false,
};

const wishlistSlice = createSlice({
  name: "wishlist",
  initialState,
  reducers: {
    setProjectName(state, action) {
      state.projectName = action.payload;
    },
    addToWishlist(state, action) {
      const exists = state.items.find((i) => i.id === action.payload.id);
      if (!exists) {
        state.items.push(action.payload);
      }
    },
    removeFromWishlist(state, action) {
      state.items = state.items.filter((i) => i.id !== action.payload);
    },
    toggleSidebar(state) {
      state.isOpen = !state.isOpen;
    },
    updateItemNotes(state, action) {
      const { id, notes } = action.payload;
      const item = state.items.find((i) => i.id === id);
      if (item) {
        item.notes = notes;
      }
    },
  },
});

export const {
  setProjectName,
  addToWishlist,
  removeFromWishlist,
  toggleSidebar,
  updateItemNotes,
} = wishlistSlice.actions;

export default wishlistSlice.reducer;
