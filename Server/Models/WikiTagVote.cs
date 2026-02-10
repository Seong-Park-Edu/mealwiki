using System;
using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;

namespace Server.Models
{
    [Table("wiki_tag_votes")]
    public class WikiTagVote : BaseModel
    {
        [PrimaryKey("id")]
        public Guid Id { get; set; }

        // ★ PostId 삭제됨

        [Column("restaurant_id")]
        public required string RestaurantId { get; set; } // ★ 식당에 종속됨

        [Column("user_id")]
        public Guid UserId { get; set; }

        [Column("tag")]
        public required string Tag { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; }
    }
}
