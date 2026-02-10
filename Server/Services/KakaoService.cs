//카카오 서버에 전화를 거는 코드

using System.Net.Http.Headers;
using Newtonsoft.Json;
using Server.Models;

namespace Server.Services
{
    public class KakaoService
    {
        private readonly string _apiKey;
        private readonly HttpClient _httpClient;

        // 생성자: 프로그램이 시작될 때 HttpClient와 API Key를 주입받습니다.
        public KakaoService(HttpClient httpClient, IConfiguration configuration)
        {
            _httpClient = httpClient;
            // appsettings.json에서 키를 가져옵니다.
            _apiKey =
                configuration["Kakao:ApiKey"] ?? throw new ArgumentNullException("Kakao:ApiKey");
        }

        public async Task<List<KakaoDocument>> SearchRestaurantsAsync(string query, int page = 1)
        {
            // 1. URL 만들기 (음식점 코드 FD6, 페이지당 15개)
            string url =
                $"https://dapi.kakao.com/v2/local/search/keyword.json?query={query}&category_group_code=FD6&page={page}";

            // 2. 헤더에 인증키 담기
            var request = new HttpRequestMessage(HttpMethod.Get, url);
            request.Headers.Authorization = new AuthenticationHeaderValue("KakaoAK", _apiKey);

            // 3. 전송하고 응답 기다리기
            var response = await _httpClient.SendAsync(request);

            if (response.IsSuccessStatusCode)
            {
                // 4. JSON을 C# 객체로 변환 (역직렬화)
                var jsonString = await response.Content.ReadAsStringAsync();
                var result = JsonConvert.DeserializeObject<KakaoApiResponse>(jsonString);

                return result?.documents ?? new List<KakaoDocument>();
            }

            // 실패하면 빈 리스트 반환 (나중에는 에러 로그를 남기면 좋습니다)
            return new List<KakaoDocument>();
        }
    }
}
