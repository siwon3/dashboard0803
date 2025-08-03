"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Plus, Users, Bell, Edit, Trash2, GripVertical, X } from "lucide-react"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { Calendar } from "@/components/ui/calendar"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

interface Task {
  id: string
  title: string
  description: string
  deadline?: Date
  assignee?: string
  column_id: string
}

interface TaskColumn {
  id: string
  title: string
  tasks: Task[]
}

interface Goals {
  target_traffic: number | null
  target_conversion: number | null
}

export default function LectureManagement() {
  const [newTaskTitle, setNewTaskTitle] = useState("")
  const [activeColumn, setActiveColumn] = useState<string | null>(null)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null)
  const [draggedTask, setDraggedTask] = useState<{ task: Task; fromColumn: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  // 목표 설정 상태
  const [goals, setGoals] = useState<Goals>({ target_traffic: null, target_conversion: null })

  // 편집용 임시 상태
  const [editTitle, setEditTitle] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editAssignee, setEditAssignee] = useState("")
  const [editDeadline, setEditDeadline] = useState<Date | undefined>(undefined)

  const [taskColumns, setTaskColumns] = useState<TaskColumn[]>([
    { id: "todo", title: "해야 할 일 (TO DO)", tasks: [] },
    { id: "doing", title: "진행 중 (DOING)", tasks: [] },
    { id: "done", title: "완료 (DONE)", tasks: [] },
    { id: "agenda", title: "회의사안/요청할 사안", tasks: [] },
  ])

  // 데이터 로드
  useEffect(() => {
    loadTasks()
    loadGoals()
  }, [])

  const loadTasks = async () => {
    try {
      const { data, error } = await supabase.from("tasks").select("*").order("created_at", { ascending: true })

      if (error) throw error

      const tasksWithDates = data.map((task) => ({
        ...task,
        deadline: task.deadline ? new Date(task.deadline) : undefined,
      }))

      setTaskColumns((prev) =>
        prev.map((column) => ({
          ...column,
          tasks: tasksWithDates.filter((task) => task.column_id === column.id),
        })),
      )
    } catch (error) {
      console.error("태스크 로드 실패:", error)
      toast({
        title: "오류",
        description: "태스크를 불러오는데 실패했습니다.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadGoals = async () => {
    try {
      // 먼저 테이블이 존재하는지 확인
      const { data, error } = await supabase
        .from("goals")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)

      if (error) {
        // 테이블이 존재하지 않는 경우 기본값 사용
        if (error.code === "42P01" || error.message.includes("does not exist")) {
          console.log("Goals 테이블이 존재하지 않습니다. 기본값을 사용합니다.")
          setGoals({ target_traffic: null, target_conversion: null })
          return
        }
        throw error
      }

      if (data && data.length > 0) {
        setGoals({
          target_traffic: data[0].target_traffic,
          target_conversion: data[0].target_conversion,
        })
      }
    } catch (error) {
      console.error("목표 로드 실패:", error)
      // 에러가 발생해도 기본값으로 설정
      setGoals({ target_traffic: null, target_conversion: null })
    }
  }

  const addTask = async (columnId: string) => {
    if (!newTaskTitle.trim()) return

    try {
      const { data, error } = await supabase
        .from("tasks")
        .insert([
          {
            title: newTaskTitle,
            description: "",
            column_id: columnId,
          },
        ])
        .select()
        .single()

      if (error) throw error

      const newTask = {
        ...data,
        deadline: data.deadline ? new Date(data.deadline) : undefined,
      }

      setTaskColumns((prev) =>
        prev.map((column) => (column.id === columnId ? { ...column, tasks: [...column.tasks, newTask] } : column)),
      )

      setNewTaskTitle("")
      setActiveColumn(null)

      toast({
        title: "성공",
        description: "태스크가 추가되었습니다.",
      })
    } catch (error) {
      console.error("태스크 추가 실패:", error)
      toast({
        title: "오류",
        description: "태스크 추가에 실패했습니다.",
        variant: "destructive",
      })
    }
  }

  const saveTask = async () => {
    if (!editingTask) return

    try {
      const { error } = await supabase
        .from("tasks")
        .update({
          title: editTitle,
          description: editDescription,
          assignee: editAssignee || null,
          deadline: editDeadline ? editDeadline.toISOString() : null,
        })
        .eq("id", editingTask.id)

      if (error) throw error

      const updatedTask: Task = {
        ...editingTask,
        title: editTitle,
        description: editDescription,
        assignee: editAssignee || undefined,
        deadline: editDeadline,
      }

      setTaskColumns((prev) =>
        prev.map((column) => ({
          ...column,
          tasks: column.tasks.map((task) => (task.id === editingTask.id ? updatedTask : task)),
        })),
      )

      setIsEditDialogOpen(false)
      setEditingTask(null)

      toast({
        title: "성공",
        description: "태스크가 수정되었습니다.",
      })
    } catch (error) {
      console.error("태스크 수정 실패:", error)
      toast({
        title: "오류",
        description: "태스크 수정에 실패했습니다.",
        variant: "destructive",
      })
    }
  }

  const deleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase.from("tasks").delete().eq("id", taskId)

      if (error) throw error

      setTaskColumns((prev) =>
        prev.map((column) => ({
          ...column,
          tasks: column.tasks.filter((task) => task.id !== taskId),
        })),
      )

      setDeleteTaskId(null)

      toast({
        title: "성공",
        description: "태스크가 삭제되었습니다.",
      })
    } catch (error) {
      console.error("태스크 삭제 실패:", error)
      toast({
        title: "오류",
        description: "태스크 삭제에 실패했습니다.",
        variant: "destructive",
      })
    }
  }

  const moveTask = async (taskId: string, fromColumn: string, toColumn: string) => {
    try {
      const { error } = await supabase.from("tasks").update({ column_id: toColumn }).eq("id", taskId)

      if (error) throw error

      const task = taskColumns.find((col) => col.id === fromColumn)?.tasks.find((t) => t.id === taskId)

      if (!task) return

      setTaskColumns((prev) =>
        prev.map((column) => {
          if (column.id === fromColumn) {
            return {
              ...column,
              tasks: column.tasks.filter((t) => t.id !== taskId),
            }
          } else if (column.id === toColumn) {
            return {
              ...column,
              tasks: [...column.tasks, { ...task, column_id: toColumn }],
            }
          }
          return column
        }),
      )
    } catch (error) {
      console.error("태스크 이동 실패:", error)
      toast({
        title: "오류",
        description: "태스크 이동에 실패했습니다.",
        variant: "destructive",
      })
    }
  }

  const saveGoals = async (traffic: number | null, conversion: number | null) => {
    try {
      // upsert 대신 insert 또는 update 시도
      const { data: existingData } = await supabase.from("goals").select("id").limit(1)

      let error
      if (existingData && existingData.length > 0) {
        // 기존 데이터가 있으면 업데이트
        const result = await supabase
          .from("goals")
          .update({
            target_traffic: traffic,
            target_conversion: conversion,
          })
          .eq("id", existingData[0].id)
        error = result.error
      } else {
        // 기존 데이터가 없으면 새로 삽입
        const result = await supabase.from("goals").insert({
          target_traffic: traffic,
          target_conversion: conversion,
        })
        error = result.error
      }

      if (error) {
        // 테이블이 존재하지 않는 경우 로컬 상태만 업데이트
        if (error.code === "42P01" || error.message.includes("does not exist")) {
          console.log("Goals 테이블이 존재하지 않습니다. 로컬 상태만 업데이트합니다.")
          setGoals({ target_traffic: traffic, target_conversion: conversion })
          toast({
            title: "알림",
            description: "목표가 임시 저장되었습니다. 데이터베이스 설정을 확인해주세요.",
          })
          return
        }
        throw error
      }

      setGoals({ target_traffic: traffic, target_conversion: conversion })

      toast({
        title: "성공",
        description: "목표가 저장되었습니다.",
      })
    } catch (error) {
      console.error("목표 저장 실패:", error)
      // 에러가 발생해도 로컬 상태는 업데이트
      setGoals({ target_traffic: traffic, target_conversion: conversion })
      toast({
        title: "경고",
        description: "목표가 임시 저장되었습니다. 데이터베이스 연결을 확인해주세요.",
        variant: "destructive",
      })
    }
  }

  const openEditDialog = (task: Task) => {
    setEditingTask(task)
    setEditTitle(task.title)
    setEditDescription(task.description)
    setEditAssignee(task.assignee || "")
    setEditDeadline(task.deadline)
    setIsEditDialogOpen(true)
  }

  const getDeadlineStatus = (deadline?: Date) => {
    if (!deadline) return null

    const now = new Date()
    const diffDays = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
      return { status: "overdue", color: "bg-red-100 text-red-800 border-red-200", text: "지남" }
    } else if (diffDays <= 2) {
      return { status: "urgent", color: "bg-orange-100 text-orange-800 border-orange-200", text: "임박" }
    } else if (diffDays <= 7) {
      return { status: "soon", color: "bg-yellow-100 text-yellow-800 border-yellow-200", text: "곧" }
    } else {
      return { status: "normal", color: "bg-blue-100 text-blue-800 border-blue-200", text: "여유" }
    }
  }

  const handleDragStart = (e: React.DragEvent, task: Task, fromColumn: string) => {
    setDraggedTask({ task, fromColumn })
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  const handleDrop = (e: React.DragEvent, toColumn: string) => {
    e.preventDefault()

    if (!draggedTask || draggedTask.fromColumn === toColumn) {
      setDraggedTask(null)
      return
    }

    moveTask(draggedTask.task.id, draggedTask.fromColumn, toColumn)
    setDraggedTask(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">데이터를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">강의 기획 관리</h1>
          <p className="text-gray-600">프로젝트 진행 상황과 마케팅 현황을 한눈에 확인하세요</p>
        </div>

        {/* 목표 설정 섹션 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">목표 유입수</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <Input
                type="number"
                placeholder="목표 유입수를 입력하세요"
                className="text-xl font-bold border-0 p-0 h-auto"
                value={goals.target_traffic || ""}
                onChange={(e) => {
                  const value = e.target.value ? Number.parseInt(e.target.value) : null
                  saveGoals(value, goals.target_conversion)
                }}
              />
              <p className="text-xs text-muted-foreground mt-2">월간 목표 설정</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">목표 오픈알림 전환수</CardTitle>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <Input
                type="number"
                placeholder="목표 전환수를 입력하세요"
                className="text-xl font-bold border-0 p-0 h-auto"
                value={goals.target_conversion || ""}
                onChange={(e) => {
                  const value = e.target.value ? Number.parseInt(e.target.value) : null
                  saveGoals(goals.target_traffic, value)
                }}
              />
              <p className="text-xs text-muted-foreground mt-2">월간 목표 설정</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {taskColumns.map((column) => (
            <Card
              key={column.id}
              className="flex flex-col h-full"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  {column.title}
                  <Badge variant="secondary">{column.tasks.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 flex-1 flex flex-col">
                {column.tasks.map((task) => {
                  const deadlineStatus = getDeadlineStatus(task.deadline)
                  return (
                    <Card
                      key={task.id}
                      className="p-3 hover:shadow-md transition-shadow cursor-move"
                      draggable
                      onDragStart={(e) => handleDragStart(e, task, column.id)}
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <h4 className="font-medium text-sm flex-1">{task.title}</h4>
                          <div className="flex items-center gap-1 ml-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={() => openEditDialog(task)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                              onClick={() => setDeleteTaskId(task.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                            <GripVertical className="h-3 w-3 text-gray-400" />
                          </div>
                        </div>
                        {task.description && <p className="text-xs text-gray-600">{task.description}</p>}
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          {deadlineStatus && (
                            <Badge className={`text-xs ${deadlineStatus.color}`}>
                              {task.deadline && format(task.deadline, "MM/dd", { locale: ko })} ({deadlineStatus.text})
                            </Badge>
                          )}
                          {task.assignee && <span className="text-xs text-gray-500">{task.assignee}</span>}
                        </div>
                      </div>
                    </Card>
                  )
                })}

                {activeColumn === column.id ? (
                  <div className="space-y-2">
                    <Input
                      placeholder="새 태스크 제목"
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && addTask(column.id)}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => addTask(column.id)}>
                        추가
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setActiveColumn(null)}>
                        취소
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-gray-500 hover:text-gray-700"
                    onClick={() => setActiveColumn(column.id)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    태스크 추가
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 태스크 편집 다이얼로그 */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[300px] leading-5 mx-0 my-0.5">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle>태스크 편집</DialogTitle>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setIsEditDialogOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <DialogDescription>태스크의 세부 정보를 수정할 수 있습니다.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="title">제목</Label>
                <Input
                  id="title"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="태스크 제목을 입력하세요"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">설명</Label>
                <Textarea
                  id="description"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="태스크 설명을 입력하세요"
                  rows={3}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="assignee">담당자</Label>
                <Input
                  id="assignee"
                  value={editAssignee}
                  onChange={(e) => setEditAssignee(e.target.value)}
                  placeholder="담당자 이름을 입력하세요"
                />
              </div>
              <div className="grid gap-2">
                <Label>데드라인</Label>
                <div className="flex justify-center">
                  <Calendar
                    mode="single"
                    selected={editDeadline}
                    onSelect={setEditDeadline}
                    className="rounded-md border scale-90"
                    locale={ko}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                취소
              </Button>
              <Button onClick={saveTask}>저장</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 삭제 확인 다이얼로그 */}
        <AlertDialog open={!!deleteTaskId} onOpenChange={() => setDeleteTaskId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>태스크 삭제</AlertDialogTitle>
              <AlertDialogDescription>
                이 태스크를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction onClick={() => deleteTaskId && deleteTask(deleteTaskId)}>삭제</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
