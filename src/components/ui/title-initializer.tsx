"use client";

import { useEffect, useState } from "react";

export default function TitleInitializer() {
  const [title, setTitle] = useState("生产管理系统");

  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch("/api/system/config?type=param", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        if (data.code === 200 && data.data) {
          const nameConfig = data.data.find((c: any) => c.paramKey === 'system_name');
          if (nameConfig) {
            const name = nameConfig.paramValue;
            setTitle(name);
            document.title = name;
          }
        }
      })
      .catch(() => {});
  }, []);

  return null;
}
