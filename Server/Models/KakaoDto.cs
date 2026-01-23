//카카오가 보내주는 JSON 데이터를 C#이 이해할 수 있는 객체로 변환하는 틀입니다.

namespace Server.Models
{
    // 카카오 API 전체 응답 (껍데기)
    public class KakaoApiResponse
    {
        public List<KakaoDocument> documents { get; set; }
        public KakaoMeta meta { get; set; }
    }

    // 우리가 진짜 필요한 알맹이 정보
    public class KakaoDocument
    {
        public string id { get; set; }                // 장소 ID
        public string place_name { get; set; }        // 가게 이름
        public string phone { get; set; }             // 전화번호
        public string address_name { get; set; }      // 지번 주소
        public string road_address_name { get; set; } // 도로명 주소
        public string x { get; set; }                 // 경도 (Longitude)
        public string y { get; set; }                 // 위도 (Latitude)
        public string place_url { get; set; }         // 카카오맵 상세 링크
        public string category_name { get; set; }     // 카테고리 (음식점 > 한식...)
    }

    // 검색 결과 정보 (개수 등)
    public class KakaoMeta
    {
        public int total_count { get; set; }
        public bool is_end { get; set; }
    }
}