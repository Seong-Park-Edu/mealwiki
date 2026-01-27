using Newtonsoft.Json;
using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;

namespace Server.Models
{
    [Table("recommend_logs")]
    public class RecommendLog : BaseModel
    {
        [PrimaryKey("id", false)] // DB가 생성하므로 false
        [JsonProperty("id")]
        public Guid Id { get; set; }

        [Column("restaurant_id")]
        [JsonProperty("restaurant_id")]
        public string RestaurantId { get; set; } = null!;

        [Column("created_at")]
        [JsonProperty("created_at")]
        public DateTime CreatedAt { get; set; }
    }
}