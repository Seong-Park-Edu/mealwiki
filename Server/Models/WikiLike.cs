using System;
using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;

namespace Server.Models
{
    [Table("wiki_likes")]
    public class WikiLike : BaseModel
    {
        [PrimaryKey("id")]
        public Guid Id { get; set; }

        [Column("user_id")]
        public Guid UserId { get; set; }

        [Column("restaurant_id")]
        public string RestaurantId { get; set; } = string.Empty;

        // ★ [추가] 추천 대상(기여자) ID
        [Column("target_user_id")]
        public Guid TargetUserId { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; }
    }
}
