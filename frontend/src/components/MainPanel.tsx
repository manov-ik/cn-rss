import { ReactNode } from "react";

export const MainPanel = ({ children }: { children: ReactNode }) => {
  return (
    <div className="relative flex flex-col w-full h-full">
      <div className="flex-1 flex flex-row md:p-2 md:pl-0 p-0 overflow-hidden">
        <div className="bg-panel flex w-full h-full flex-1 overflow-hidden md:rounded-md md:border">{children}</div>
      </div>
    </div>
  );
};
