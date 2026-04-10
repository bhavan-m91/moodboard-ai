import { configureStore } from "@reduxjs/toolkit";
import searchReducer from "./searchSlice";
import wishlistReducer from "./wishlistSlice";

export const store = configureStore({
  reducer: {
    search: searchReducer,
    wishlist: wishlistReducer,
  },
});
