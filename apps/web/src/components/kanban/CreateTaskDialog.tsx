"use client";

import { useState } from "react";
import { StageInfo } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface CreateTaskDialogProps {
  stages: StageInfo[];
  onCreate: (title: string, description: string, stage: string) => void;
}

export function CreateTaskDialog({ stages, onCreate }: CreateTaskDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [stage, setStage] = useState(stages[0]?.key || "requirement");

  const handleSubmit = () => {
    if (!title.trim()) return;
    onCreate(title.trim(), description.trim(), stage);
    setTitle("");
    setDescription("");
    setStage(stages[0]?.key || "requirement");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm">+ 新建任务</Button>} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>新建任务</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">标题</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="任务标题"
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">描述</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="任务描述（可选）"
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">阶段</label>
            <div className="flex gap-2 flex-wrap">
              {stages.filter((s) => s.key !== "done").map((s) => (
                <Button
                  key={s.key}
                  size="sm"
                  variant={stage === s.key ? "default" : "outline"}
                  onClick={() => setStage(s.key)}
                >
                  {s.label}
                </Button>
              ))}
            </div>
          </div>
          <Button className="w-full" onClick={handleSubmit} disabled={!title.trim()}>
            创建
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
