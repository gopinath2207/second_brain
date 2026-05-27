/**
 * store.js — Redux Toolkit store configuration.
 */
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import blockReducer from './blockSlice';
import habitReducer from './habitSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    blocks: blockReducer,
    habits: habitReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore non-serializable values in specific action paths
        ignoredActions: ['blocks/create/fulfilled', 'blocks/update/fulfilled'],
      },
    }),
  devTools: import.meta.env.DEV,
});

export default store;
