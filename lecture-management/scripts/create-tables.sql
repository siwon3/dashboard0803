-- 태스크 테이블 생성
CREATE TABLE IF NOT EXISTS tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  deadline TIMESTAMPTZ,
  assignee TEXT,
  column_id TEXT NOT NULL CHECK (column_id IN ('todo', 'doing', 'done', 'agenda')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 목표 설정 테이블 생성 (존재하지 않을 경우에만)
CREATE TABLE IF NOT EXISTS goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  target_traffic INTEGER,
  target_conversion INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 업데이트 시간 자동 갱신을 위한 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 트리거 생성
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_goals_updated_at BEFORE UPDATE ON goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 초기 데이터 삽입
INSERT INTO tasks (title, description, deadline, assignee, column_id) VALUES
('강의 커리큘럼 최종 검토', '전체 커리큘럼 구성 및 학습 목표 점검', '2024-12-20', '김PM', 'todo'),
('강사 섭외 및 계약', '전문 강사 3명 컨택 및 계약 진행', '2024-12-25', '이매니저', 'todo'),
('랜딩페이지 제작', '강의 소개 및 등록 페이지 디자인 작업', '2024-12-18', '박디자이너', 'doing'),
('마케팅 콘텐츠 제작', 'SNS 홍보용 이미지 및 카피 작성', '2024-12-22', '최마케터', 'doing'),
('시장 조사 완료', '타겟 고객층 분석 및 경쟁사 조사', '2024-12-10', '김PM', 'done'),
('강의 제목 및 부제목 확정', 'SEO 최적화된 강의명 결정', '2024-12-12', '김PM', 'done'),
('가격 정책 논의', '얼리버드 할인 및 정가 책정 회의 필요', '2024-12-16', '전체', 'agenda'),
('런칭 일정 조율', '마케팅 캠페인과 강의 오픈 일정 동기화', '2024-12-19', '전체', 'agenda');

-- 초기 목표 데이터 (테이블이 비어있을 경우에만)
INSERT INTO goals (target_traffic, target_conversion) 
SELECT 1000, 100
WHERE NOT EXISTS (SELECT 1 FROM goals);
