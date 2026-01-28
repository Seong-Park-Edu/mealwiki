using Microsoft.AspNetCore.Mvc;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Server.Controllers // 본인의 프로젝트 네임스페이스로 변경하세요
{
    [ApiController]
    [Route("api/gemini")]
    public class GeminiLunchController : ControllerBase
    {
        // ★ 여기에 발급받은 API 키를 넣으세요
        private readonly string _apiKey;
        private readonly HttpClient _httpClient;

        public GeminiLunchController(IHttpClientFactory httpClientFactory, IConfiguration configuration)
        {
            // API 키를 비밀 금고(User Secrets)에서 키를 꺼내와서 변수에 넣습니다.
            _apiKey = configuration["Gemini:ApiKey"] ?? throw new ArgumentNullException("GeminiApiKey 설정이 필요합니다.");
            _httpClient = httpClientFactory.CreateClient();
        }


        [HttpGet("models")]
        public async Task<IActionResult> GetAvailableModels()
        {
            // 내 API 키로 쓸 수 있는 모든 모델을 조회하는 URL
            string url = $"https://generativelanguage.googleapis.com/v1beta/models?key={_apiKey}";

            try
            {
                var response = await _httpClient.GetAsync(url);
                var jsonString = await response.Content.ReadAsStringAsync();

                // JSON 결과를 그대로 화면에 보여줍니다.
                return Ok(jsonString);
            }
            catch (Exception ex)
            {
                return BadRequest($"조회 실패: {ex.Message}");
            }
        }


        [HttpPost("recommend")]
        public async Task<IActionResult> GetRecommendation([FromBody] UserInfo input)
        {
            // 1. Gemini API URL (모델: gemini-1.5-flash)
            string url = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key={_apiKey}";

            // 2. 프롬프트: 운세와 메뉴를 JSON으로 달라고 강력하게 요청
            var prompt = $@"
                너는 30년 경력의 사주 명리학자야. 
                사용자 정보: [이름: {input.Name}, 생년월일: {input.BirthDate}, 태어난 시간: {input.BirthTime}, 성별: {input.Gender}]
                오늘 날짜: {DateTime.Now:yyyy-MM-dd}

                [미션]
                1. **'{input.Name}'님의**의 사주와 '성별에 따른 대운의 흐름'을 고려해서 오늘의 운세를 최대 6문장으로 요약해줘. 
                2. 이름을 불러주면서 시작해.
                3. 부족한 오행을 분석해서 **'{input.MealType} 메뉴'**를 1개 추천해줘. 
                4. 한식, 일식, 중식, 양식 모두 가능해. 메뉴 이름은 명사만 딱 1개만 써줘.
                5. 추천 이유는 사주학적 근거(오행, 색깔, 기운 등)를 들어서 설명해줘.
                
                [출력 형식]
                반드시 아래 JSON 포맷으로만 응답해. 마크다운이나 다른 말 하지마.
                {{
                    ""fortune"": ""운세 내용"",
                    ""menu"": ""메뉴명"",
                    ""reason"": ""추천 이유""
                }}";

            // 3. 요청 데이터 구성
            var requestBody = new
            {
                contents = new[] { new { parts = new[] { new { text = prompt } } } },
                generationConfig = new { response_mime_type = "application/json" } // JSON 모드 강제
            };

            var jsonContent = new StringContent(
                JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");

            try
            {
                // 4. API 호출
                var response = await _httpClient.PostAsync(url, jsonContent);
                var responseString = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    return StatusCode((int)response.StatusCode, $"API 오류: {responseString}");
                }

                // 5. 응답 파싱
                var geminiData = JsonSerializer.Deserialize<GeminiResponse>(responseString);
                var resultText = geminiData?.Candidates?[0]?.Content?.Parts?[0]?.Text;

                // Gemini가 준 텍스트(JSON)를 그대로 프론트로 전달
                // (실제 앱에서는 여기서 한 번 더 파싱해서 깔끔하게 줄 수도 있음)
                return Ok(resultText);
            }
            catch (Exception ex)
            {
                return BadRequest($"서버 에러: {ex.Message}");
            }
        }
    }

    // --- DTO 클래스들 ---
    public class UserInfo
    {
        public string Name { get; set; } // ★ 이름 추가
        public string BirthDate { get; set; } // 예: 1996-01-01
        public string BirthTime { get; set; } // 예: 14:30
        public string Gender { get; set; } // "male" or "female"
        public string MealType { get; set; } // "아침", "점심", "저녁"
    }

    // Gemini 응답 매핑용 클래스
    public class GeminiResponse
    {
        [JsonPropertyName("candidates")]
        public List<Candidate> Candidates { get; set; }
    }
    public class Candidate
    {
        [JsonPropertyName("content")]
        public Content Content { get; set; }
    }
    public class Content
    {
        [JsonPropertyName("parts")]
        public List<Part> Parts { get; set; }
    }
    public class Part
    {
        [JsonPropertyName("text")]
        public string Text { get; set; }
    }
}