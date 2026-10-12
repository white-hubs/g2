export interface TodoTaskType {
  code: string;
  name: string;
}
export interface TodoTaskTag {
  businessType: string;
  businessTypeName: string;
  total: number | string;
}
export interface TodoTaskTrend {
  total: number;
  period: string;
}
export interface TaskRecord {
  applicationCode: string;
  applicationName: string;
  businessKey: string;
  businessPrincipal: string;
  businessStatus: string;
  businessStatusName: string;
  businessType: string;
  businessTypeName: string;
  handlerTime: number | null;
  id: string;
  nextBusinessStatus: string;
  nextBusinessStatusName: string;
  status: string;
  taskDelState: boolean;
  taskName: string;
  taskTime: number;
  url: string;
}
export interface TodoTaskQuery {
  pageNumber: number;
  pageSize: number;
  todoTagCode?: string;
  period?: string;
  keyword?: string;
}
export interface TodoTaskPage {
  records: TaskRecord[];
  total: number;
  pages: number;
}
export interface TodoCenterClient {
  getTodoTaskCount(): Promise<number>;
  getTodoTaskTags(): Promise<TodoTaskTag[]>;
  getTodoTaskTagsTrend(): Promise<TodoTaskTrend[]>;
  getTodoTaskTypes(done?: boolean): Promise<TodoTaskType[]>;
  pageTodoTasks(query: TodoTaskQuery): Promise<TodoTaskPage>;
  pageDoneTasks(query: TodoTaskQuery): Promise<TodoTaskPage>;
}
