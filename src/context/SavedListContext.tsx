import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";
import { Toast } from "../components/Toast";
import { useAuth } from "./AuthContext";
import {
  getSavedList,
  mergeGuestSavedListIntoUser,
  removeSavedListItem,
  toggleSavedListItem,
} from "../utils/userStorage";

type SavedListContextValue = {
  savedIds: ReadonlySet<string>;
  isSaved: (productId: string) => boolean;
  toggleSaved: (productId: string) => boolean;
  removeSaved: (productId: string) => void;
};

const SavedListContext = createContext<SavedListContextValue | null>(null);

const SAVED_TOAST_MS = 3000;

export function SavedListProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [savedIds, setSavedIds] = useState<ReadonlySet<string>>(() => new Set());
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reload = useCallback((userId: string | null | undefined) => {
    setSavedIds(new Set(getSavedList(userId)));
  }, []);

  useEffect(() => {
    if (user?.id) {
      mergeGuestSavedListIntoUser(user.id);
    }
    reload(user?.id);
  }, [user?.id, reload]);

  const isSaved = useCallback(
    (productId: string) => savedIds.has(productId),
    [savedIds]
  );

  const dismissToast = useCallback(() => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    setToastVisible(false);
  }, []);

  const showSavedToast = useCallback(() => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToastVisible(true);
    toastTimerRef.current = setTimeout(() => {
      setToastVisible(false);
      toastTimerRef.current = null;
    }, SAVED_TOAST_MS);
  }, []);

  useEffect(() => () => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
  }, []);

  const toggleSaved = useCallback(
    (productId: string) => {
      const nowSaved = toggleSavedListItem(user?.id, productId);
      reload(user?.id);
      if (nowSaved) {
        showSavedToast();
      }
      return nowSaved;
    },
    [user?.id, reload, showSavedToast]
  );

  const removeSaved = useCallback(
    (productId: string) => {
      removeSavedListItem(user?.id, productId);
      reload(user?.id);
    },
    [user?.id, reload]
  );

  const value = useMemo(
    () => ({ savedIds, isSaved, toggleSaved, removeSaved }),
    [savedIds, isSaved, toggleSaved, removeSaved]
  );

  return (
    <SavedListContext.Provider value={value}>
      {children}
      {toastVisible ? (
        <Toast
          message={t("lists.savedToast")}
          dismissLabel={t("common.close")}
          onDismiss={dismissToast}
        />
      ) : null}
    </SavedListContext.Provider>
  );
}

export function useSavedList() {
  const ctx = useContext(SavedListContext);
  if (!ctx) throw new Error("useSavedList must be used within SavedListProvider");
  return ctx;
}
