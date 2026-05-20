# 数独星盘

一个基于 React + Vite 的数独小游戏，支持三档难度、计时计分、排行榜、数字高亮、每局 3 次提示机会，以及通关烟花效果。

GitHub 仓库：

```text
https://github.com/jacurtwong/sudoku-star
```

## 功能

- 三档难度：轻松、进阶、大师
- 9x9 数独棋盘，自动生成唯一解题目
- 小键盘输入，并显示每个数字已出现数量
- 点击任意数字时，高亮棋盘中相同数字
- 每局 3 次提示机会
- 本地排行榜，保存成绩后自动进入新局
- 通关烟花动画
- 响应式布局，支持桌面和移动端

## 本地开发

安装依赖：

```bash
npm install
```

启动开发服务器：

```bash
npm run dev
```

默认访问：

```text
http://127.0.0.1:5173
```

局域网内其他设备访问时，把地址里的 `127.0.0.1` 换成这台机器的局域网 IP。

生产构建：

```bash
npm run build
```

## Docker Compose 部署

项目已包含 `Dockerfile`、`nginx.conf` 和 `docker-compose.yml`。部署时会先构建 Vite 静态文件，再用 Nginx 托管。

从 GitHub 克隆：

```bash
git clone https://github.com/jacurtwong/sudoku-star.git
cd sudoku-star
```

启动：

```bash
docker compose up --build -d
```

访问：

```text
http://localhost:8080
```

局域网内其他设备访问时，把 `localhost` 换成部署机器的局域网 IP。

停止：

```bash
docker compose down
```

## 推送镜像到 Docker Hub

Windows 下一键构建并推送多架构镜像：

```powershell
.\push-dockerhub.bat
```

脚本会推送到：

```text
jacurtwongapp/sudoku-star:latest
```

飞牛 NAS 如果不想在 NAS 上构建源码，可以使用镜像版 compose：

```bash
docker compose -f docker-compose.image.yml up -d
```

更新镜像：

```bash
docker compose -f docker-compose.image.yml pull
docker compose -f docker-compose.image.yml up -d
```

## 推送到 GitHub

本项目已发布到公开仓库：

```text
https://github.com/jacurtwong/sudoku-star
```

如果之后你要重新从本地创建另一个公开仓库，可以用下面流程：

```bash
git init
git add .
git commit -m "Initial Sudoku game"
gh repo create sudoku-star --public --source=. --remote=origin --push
```

如果仓库已经在 GitHub 上创建好了，可以改用：

```bash
git init
git add .
git commit -m "Initial Sudoku game"
git branch -M main
git remote add origin https://github.com/<your-user>/<your-repo>.git
git push -u origin main
```
