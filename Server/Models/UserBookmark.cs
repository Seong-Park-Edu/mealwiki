using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;
using System;

namespace Server.Models
{
    [Table("user_bookmarks")]
    public class UserBookmark : BaseModel
    {
        [PrimaryKey("id")]
        public Guid Id { get; set; }

        [Column("user_id")]
        public Guid UserId { get; set; }

        [Column("restaurant_id")]
        public string RestaurantId { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; }
    }
}