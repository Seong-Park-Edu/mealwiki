using Newtonsoft.Json;
using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;

//Supabase의 테이블(wiki_posts 등)과 짝이 되는 **C# 클래스(Model)**
namespace Server.Models
{
    // 1. 위키 본문 (wiki_posts 테이블)
    [Table("wiki_posts")]
    public class WikiPost : BaseModel
    {
        [PrimaryKey("id")]
        [JsonProperty("id")]
        public Guid Id { get; set; }

        [Column("restaurant_id")]
        [JsonProperty("restaurant_id")]
        public required string RestaurantId { get; set; }

        [Column("content")]
        [JsonProperty("content")]
        public required string Content { get; set; }

        [Column("version")]
        [JsonProperty("version")]
        public int Version { get; set; }

        [Column("like_count")]
        [JsonProperty("like_count")]
        public int LikeCount { get; set; }

        [Column("updated_at")]
        [JsonProperty("updated_at")]
        public DateTime UpdatedAt { get; set; }

        // ★★★ 여기가 에러의 원인입니다! ★★★
        // JsonProperty가 없으면 대문자로 날아가서 API가 못 알아듣습니다.
        [Column("author_id")]
        [JsonProperty("author_id", NullValueHandling = NullValueHandling.Ignore)]
        public Guid? AuthorId { get; set; }

        [Column("creator_id")]
        [JsonProperty("creator_id", NullValueHandling = NullValueHandling.Ignore)]
        public Guid? CreatorId { get; set; }

        // ★ [추가] 태그 리스트
        [Column("tags")]
        [JsonProperty("tags")]
        public List<string> Tags { get; set; } = new List<string>();
    }

    // 2. 위키 역사 (wiki_history 테이블)
    [Table("wiki_history")]
    public class WikiHistory : BaseModel
    {
        [PrimaryKey("id")]
        public Guid Id { get; set; }

        [Column("post_id")]
        public Guid? PostId { get; set; }

        [Column("content")]
        public required string Content { get; set; }

        [Column("version")]
        public int Version { get; set; }

        [Column("editor_id")]
        public Guid? EditorId { get; set; }

        [Column("archived_at")]
        public DateTime ArchivedAt { get; set; }

        // ★ [추가] 태그 리스트 (과거 기록용)
        [Column("tags")]
        [JsonProperty("tags")]
        public List<string> Tags { get; set; } = new List<string>();
    }
}
